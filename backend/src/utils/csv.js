// Small dependency-free CSV serializer for the report endpoints' `?format=csv`
// export - these are flat, tabular result sets, so a hand-rolled serializer
// is simpler than pulling in a package for it.

const escapeCell = (value) => {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

/**
 * columns: [{key, header}] - key may be a dotted path (e.g. 'category.name').
 */
export const toCsv = (rows, columns) => {
  const getValue = (row, key) => key.split('.').reduce((acc, part) => acc?.[part], row);

  const headerLine = columns.map((c) => escapeCell(c.header)).join(',');
  const dataLines = rows.map((row) => columns.map((c) => escapeCell(getValue(row, c.key))).join(','));

  return [headerLine, ...dataLines].join('\n');
};
