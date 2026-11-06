import { describe, expect, it } from 'vitest';
import { gk2Data, type Quantity } from '#lib/data/gk2';
import { compileFormula, evaluateQuantity, FormulaError } from './formula';

const f = (formula: string): Quantity => ({ formula });

describe('evaluateQuantity', () => {
	it('returns plain numbers as they are', () => {
		expect(evaluateQuantity(4, {})).toBe(4);
		expect(evaluateQuantity(0, {})).toBe(0);
	});

	it('reads PPar and WorkerPar from the same level', () => {
		const levels = { perk_blacksmith: 2 };
		expect(evaluateQuantity(f('12+4*WorkerPar("perk_blacksmith")'), levels)).toBe(20);
		expect(evaluateQuantity(f('12+4*PPar("perk_blacksmith")'), levels)).toBe(20);
	});

	it('reads a perk with no level as 0', () => {
		expect(evaluateQuantity(f('4+2*WorkerPar("perk_unknown")'), {})).toBe(4);
	});

	it('follows precedence, brackets and unary minus', () => {
		expect(evaluateQuantity(f('2+3*4'), {})).toBe(14);
		expect(evaluateQuantity(f('(2+3)*4'), {})).toBe(20);
		expect(evaluateQuantity(f('10-4-3'), {})).toBe(3);
		expect(evaluateQuantity(f('12/3/2'), {})).toBe(2);
		expect(evaluateQuantity(f('-2+5'), {})).toBe(3);
		expect(evaluateQuantity(f('2*-1+5'), {})).toBe(3);
		expect(evaluateQuantity(f('0.5*4'), {})).toBe(2);
	});

	it('allows spaces anywhere between tokens', () => {
		expect(
			evaluateQuantity(f(' 3  + 1*WorkerPar( "perk_paper_maker" ) '), { perk_paper_maker: 2 })
		).toBe(5);
	});

	it('never goes below 0 (Heat Saver fuel)', () => {
		const fuel = f('20-10*WorkerPar("perk_heat_saver")');
		expect(evaluateQuantity(fuel, { perk_heat_saver: 0 })).toBe(20);
		expect(evaluateQuantity(fuel, { perk_heat_saver: 1 })).toBe(10);
		expect(evaluateQuantity(fuel, { perk_heat_saver: 2 })).toBe(0);
		expect(evaluateQuantity(fuel, { perk_heat_saver: 5 })).toBe(0);
		expect(evaluateQuantity(-3, {})).toBe(0);
	});

	it.each([
		'',
		'perk_alchemist',
		'2+',
		'(2+3',
		'2+3)',
		'2 3',
		'alert(1)',
		'PPar(perk_cook)',
		'Math.max(1,2)',
		'2**3'
	])('rejects %j', (formula) => {
		expect(() => evaluateQuantity(f(formula), {})).toThrow(FormulaError);
	});

	it('rejects a result that is not a finite number', () => {
		expect(() => evaluateQuantity(f('1/0'), {})).toThrow(FormulaError);
	});

	it('compiles each formula once', () => {
		expect(compileFormula('1+1')).toBe(compileFormula('1+1'));
	});
});

describe('every formula in the game data', () => {
	const formulas = new Set<string>();
	const add = (q: Quantity | null) => {
		if (q !== null && typeof q !== 'number') formulas.add(q.formula);
	};
	for (const craft of gk2Data.crafts) {
		for (const o of craft.outputs) [o.count, o.min, o.max, o.chance].forEach(add);
		for (const i of craft.inputs) add(i.count);
	}
	for (const buildable of gk2Data.buildables) {
		for (const action of buildable.actions) {
			for (const o of action.outputs) [o.count, o.min, o.max, o.chance].forEach(add);
			for (const c of action.cost) add(c.count);
		}
	}

	/** The one formula with no function call, on a chance output the calculator ignores. */
	const known = new Set(['perk_alchemist']);

	it('has the formulas the schema describes', () => {
		expect(formulas.size).toBeGreaterThan(50);
	});

	it.each([...formulas].filter((x) => !known.has(x)))(
		'evaluates %s at level 0 and 6',
		(formula) => {
			const ids = Array.from(formula.matchAll(/Par\("([^"]+)"\)/g), (m) => m[1]);
			for (const level of [0, 6]) {
				const levels = Object.fromEntries(ids.map((id) => [id, level]));
				expect(evaluateQuantity(f(formula), levels)).toBeGreaterThanOrEqual(0);
			}
		}
	);

	it('rejects the one formula without a function call', () => {
		expect(formulas.has('perk_alchemist')).toBe(true);
		expect(() => compileFormula('perk_alchemist')).toThrow(FormulaError);
	});
});
