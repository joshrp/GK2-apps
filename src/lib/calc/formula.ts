import type { Quantity } from '#lib/data/gk2';
import type { PerkLevels } from '#lib/perks/levels';

/** A formula that can't be parsed or gives no finite number. */
export class FormulaError extends Error {
	constructor(
		message: string,
		readonly formula: string
	) {
		super(`${message} in formula: ${formula}`);
		this.name = 'FormulaError';
	}
}

type Evaluator = (levels: PerkLevels) => number;

type Op = '+' | '-' | '*' | '/' | '(' | ')';

type Token =
	| { kind: 'number'; value: number }
	| { kind: 'op'; value: Op }
	| { kind: 'param'; id: string };

const TOKEN = /\s*(?:(\d+(?:\.\d+)?|\.\d+)|(?:PPar|WorkerPar)\(\s*"([^"]*)"\s*\)|([-+*/()]))\s*/y;

function tokenize(formula: string): Token[] {
	const tokens: Token[] = [];
	TOKEN.lastIndex = 0;
	while (TOKEN.lastIndex < formula.length) {
		const at = TOKEN.lastIndex;
		const m = TOKEN.exec(formula);
		if (!m) throw new FormulaError(`Unexpected text at position ${at}`, formula);
		if (m[1] !== undefined) tokens.push({ kind: 'number', value: Number(m[1]) });
		else if (m[2] !== undefined) tokens.push({ kind: 'param', id: m[2] });
		else if (m[3] !== undefined) tokens.push({ kind: 'op', value: m[3] as Op });
	}
	return tokens;
}

/**
 * Recursive-descent parser over + - * /, unary minus, brackets, numbers, and
 * PPar("x") / WorkerPar("x"). Nothing else is accepted, and nothing is run as code.
 */
function parse(formula: string): Evaluator {
	const tokens = tokenize(formula);
	let pos = 0;

	const isOp = (value: string) => {
		const t = tokens[pos];
		return t?.kind === 'op' && t.value === value;
	};

	function expression(): Evaluator {
		let left = term();
		while (isOp('+') || isOp('-')) {
			const minus = isOp('-');
			pos++;
			const a = left;
			const b = term();
			left = minus ? (l) => a(l) - b(l) : (l) => a(l) + b(l);
		}
		return left;
	}

	function term(): Evaluator {
		let left = unary();
		while (isOp('*') || isOp('/')) {
			const divide = isOp('/');
			pos++;
			const a = left;
			const b = unary();
			left = divide ? (l) => a(l) / b(l) : (l) => a(l) * b(l);
		}
		return left;
	}

	function unary(): Evaluator {
		if (isOp('-')) {
			pos++;
			const a = unary();
			return (l) => -a(l);
		}
		return primary();
	}

	function primary(): Evaluator {
		const t = tokens[pos];
		if (!t) throw new FormulaError('Unexpected end', formula);
		pos++;
		if (t.kind === 'number') return () => t.value;
		if (t.kind === 'param') return (l) => l[t.id] ?? 0;
		if (t.value === '(') {
			const inner = expression();
			if (!isOp(')')) throw new FormulaError('Missing )', formula);
			pos++;
			return inner;
		}
		throw new FormulaError(`Unexpected "${t.value}"`, formula);
	}

	const result = expression();
	if (pos < tokens.length) throw new FormulaError('Unexpected text after the end', formula);
	return result;
}

const cache = new Map<string, Evaluator>();

/** Parses a formula once; the result evaluates it against perk levels. Throws FormulaError. */
export function compileFormula(formula: string): Evaluator {
	let evaluator = cache.get(formula);
	if (!evaluator) {
		evaluator = parse(formula);
		cache.set(formula, evaluator);
	}
	return evaluator;
}

/**
 * The value of a quantity at the given perk levels. Both PPar and WorkerPar read the
 * character's level; a perk with no level reads as 0. Never below 0 (Heat Saver's fuel stops
 * at 0). Throws FormulaError for a bad formula or a result that isn't a finite number.
 */
export function evaluateQuantity(quantity: Quantity, levels: PerkLevels): number {
	if (typeof quantity === 'number') return Math.max(0, quantity);
	const value = compileFormula(quantity.formula)(levels);
	if (!Number.isFinite(value))
		throw new FormulaError('Result is not a finite number', quantity.formula);
	return Math.max(0, value);
}
