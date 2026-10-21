import { csvCell, csvLine, lineNumberOf, missingColumns, stripBom, templateCsv } from './csv.rules';

describe('csv rules', () => {
  it('reports missing template columns case-insensitively', () => {
    expect(
      missingColumns(['Control_Number', ' amount '], ['control_number', 'amount', 'currency']),
    ).toEqual(['currency']);
  });

  it('maps record index to the file line number (header is line 1)', () => {
    expect(lineNumberOf(0)).toBe(2);
    expect(lineNumberOf(9)).toBe(11);
  });

  it('strips a UTF-8 BOM', () => {
    expect(stripBom('﻿a,b')).toBe('a,b');
    expect(stripBom('a,b')).toBe('a,b');
  });

  it('escapes cells and builds lines and templates', () => {
    expect(csvCell('plain')).toBe('plain');
    expect(csvCell('has, comma')).toBe('"has, comma"');
    expect(csvCell('say "hi"')).toBe('"say ""hi"""');
    expect(csvCell(null)).toBe('');
    expect(csvLine(['a', 1, 'b,c'])).toBe('a,1,"b,c"');
    expect(templateCsv(['x', 'y'])).toBe('x,y\n');
  });
});
