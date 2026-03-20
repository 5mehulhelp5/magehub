import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { PROJECT_ROOT } from './fixture.js';

export interface FormatResult {
  format: string;
  outputPath: string;
  content: string;
  fileSize: number;
  skillCount: number;
  hasFrontMatter: boolean;
}

/**
 * Generate a human-readable smoke test report in Markdown.
 * Written to `test-results/smoke-report.md` under the project root.
 */
export async function generateSmokeReport(
  results: FormatResult[],
): Promise<string> {
  const reportDir = path.join(PROJECT_ROOT, 'test-results');
  const reportPath = path.join(reportDir, 'smoke-report.md');

  await mkdir(reportDir, { recursive: true });

  const lines: string[] = [];

  lines.push('# MageHub Smoke Test Report');
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`Node: ${process.version}`);
  lines.push(`Platform: ${process.platform} ${process.arch}`);
  lines.push('');

  // Summary table
  lines.push('## Summary');
  lines.push('');
  lines.push('| Format | Output Path | Size | Skills | Front-matter |');
  lines.push('|--------|------------|------|--------|-------------|');
  for (const r of results) {
    const sizeFmt =
      r.fileSize >= 1024
        ? `${(r.fileSize / 1024).toFixed(1)} KB`
        : `${r.fileSize} B`;
    lines.push(
      `| ${r.format} | \`${r.outputPath}\` | ${sizeFmt} | ${r.skillCount} | ${r.hasFrontMatter ? 'Yes' : 'No'} |`,
    );
  }
  lines.push('');

  // Per-format details
  lines.push('## Output Previews');
  lines.push('');
  lines.push('Each section shows the first 60 lines of the generated output.');
  lines.push('');

  for (const r of results) {
    lines.push(`### ${r.format}`);
    lines.push('');
    lines.push(`- **Path**: \`${r.outputPath}\``);
    lines.push(`- **Size**: ${r.fileSize} bytes`);
    lines.push('');

    const preview = r.content.split('\n').slice(0, 60).join('\n');
    lines.push('````markdown');
    lines.push(preview);
    if (r.content.split('\n').length > 60) {
      lines.push(`\n... (${r.content.split('\n').length - 60} more lines)`);
    }
    lines.push('````');
    lines.push('');
  }

  const report = lines.join('\n');
  await writeFile(reportPath, report, 'utf8');

  return reportPath;
}
