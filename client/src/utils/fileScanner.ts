export const formatPath = (directory: string, file: string): string => {
  const base = directory.endsWith('/') ? directory : `${directory}/`;
  return `${base}${file}`;
};

export const wrapMatch = (match: string, quote: string, suffix: string): string => {
  return `${quote}${match}${suffix}${quote}`;
};

export const scanFileContent = (
  directory: string,
  file: string,
  match: string,
  quote: string,
  suffix: string
): string => {
  const fullPath = formatPath(directory, file);
  const formattedMatch = wrapMatch(match, quote, suffix);
  return `Scanning ${fullPath} found: ${formattedMatch}`;
};

export const parseFileReferences = (
  directory: string,
  file: string,
  content: string
): string[] => {
  const results: string[] = [];
  const regex = /(['"])(.*?)(['"])/g;
  
  let regexMatch: RegExpExecArray | null;
  while ((regexMatch = regex.exec(content)) !== null) {
    const [fullMatch, quote, name] = regexMatch;
    const suffix = '.ts';
    const processed = scanFileContent(directory, file, name, quote, suffix);
    results.push(processed);
  }
  
  return results;
};