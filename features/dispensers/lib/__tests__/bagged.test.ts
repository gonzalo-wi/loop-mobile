import { baggedAmong, baggedSerialsToSend, isBagged, toggleBagged, toggleCode } from '../bagged';

const entries = [
  { code: 'SN-1', valid: true, bagged: false },
  { code: 'SN-2', valid: true, bagged: true },
  { code: 'SN-NN', valid: false, bagged: true },
];

describe('baggedSerialsToSend', () => {
  it('manda los embolsados de una descarga, incluidos los no normalizados', () => {
    expect(baggedSerialsToSend('UNLOAD', entries)).toEqual(['SN-2', 'SN-NN']);
  });

  it('no manda embolsados en una carga (el backend los rechaza)', () => {
    expect(baggedSerialsToSend('LOAD', entries)).toEqual([]);
  });

  it('devuelve vacío si no hay ninguno marcado', () => {
    expect(baggedSerialsToSend('UNLOAD', [{ code: 'SN-1', bagged: false }])).toEqual([]);
  });
});

describe('toggleBagged', () => {
  it('invierte la marca solo del serial indicado', () => {
    const next = toggleBagged(entries, 'SN-1');
    expect(next.map((e) => e.bagged)).toEqual([true, true, true]);
    expect(toggleBagged(next, 'SN-2').map((e) => e.bagged)).toEqual([true, false, true]);
  });

  it('no muta la lista original', () => {
    toggleBagged(entries, 'SN-1');
    expect(entries[0].bagged).toBe(false);
  });
});

describe('toggleCode', () => {
  it('agrega el serial si no estaba y lo saca si estaba', () => {
    expect(toggleCode(['SN-1'], 'SN-2')).toEqual(['SN-1', 'SN-2']);
    expect(toggleCode(['SN-1', 'SN-2'], 'SN-1')).toEqual(['SN-2']);
  });
});

describe('baggedAmong', () => {
  it('al corregir una descarga conserva solo las marcas de series que siguen en la lista', () => {
    expect(baggedAmong('UNLOAD', ['SN-1', 'SN-3'], ['SN-1', 'SN-2'])).toEqual(['SN-1']);
  });

  it('no manda marcas en una carga', () => {
    expect(baggedAmong('LOAD', ['SN-1'], ['SN-1'])).toEqual([]);
  });
});

describe('isBagged', () => {
  it('compara sin distinguir mayúsculas, como el backend', () => {
    expect(isBagged('SN-1', ['sn-1'])).toBe(true);
    expect(isBagged('SN-2', ['SN-1'])).toBe(false);
  });
});
