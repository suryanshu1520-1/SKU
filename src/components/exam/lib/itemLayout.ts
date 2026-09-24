const isList = (l: string) => /^\s*\d{1,2}[.)]\s+\S/.test(l);
const isTable = (l: string) => /^\s*\|.*\|\s*$/.test(l);

export function normalizeStemMarkdown(stem: string): string {
  const lines = stem.split('\n');
  const out: string[] = [];

  for (const line of lines) {
    const prev = out.at(-1) ?? '';
    if (isList(line) && prev.trim() !== '' && !isList(prev)) {
      out.push('');
    }
    if (isTable(line) && prev.trim() !== '' && !isTable(prev)) {
      out.push('');
    }
    if (line.trim() !== '' && !isList(line) && !isTable(line) && (isList(prev) || isTable(prev))) {
      out.push('');
    }
    out.push(line);
  }

  return out.join('\n');
}

export function optionLayout(options: readonly string[]): 'grid' | 'list' {
  return options.every((opt) => opt.length <= 28) ? 'grid' : 'list';
}

export function pageNumberAfter(n: number): number | null {
  return n % 5 === 0 ? Math.ceil(n / 5) + 1 : null;
}
