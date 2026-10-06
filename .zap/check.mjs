// Fails the CI scan for every ZAP alert on the site that .zap/rules.tsv does not accept (IGNORE or
// WARN): a new finding has to be decided there before it passes.
// Usage: node .zap/check.mjs <rules.tsv> <zap-report.json> <site host>
import fs from 'node:fs';

const [rulesFile, reportFile, host] = process.argv.slice(2);

const accepted = new Map();
for (const line of fs.readFileSync(rulesFile, 'utf8').split('\n')) {
  const [id, action] = line.split('\t');
  if (!line.startsWith('#') && id?.trim() && (action === 'IGNORE' || action === 'WARN')) {
    accepted.set(id.trim(), action);
  }
}

const report = JSON.parse(fs.readFileSync(reportFile, 'utf8'));
// The scan's browser also calls other sites in the background; only ours counts
const site = report.site.find((s) => new URL(s['@name']).hostname === host);
if (!site) {
  console.error(`No results for ${host} in the report: did the scan reach the site?`);
  process.exit(1);
}

const failures = site.alerts.filter((a) => !accepted.has(a.pluginid));
for (const a of site.alerts) {
  const status = accepted.get(a.pluginid) ?? 'FAIL';
  console.log(`${status.padEnd(6)} ${a.pluginid} ${a.name} [${a.riskdesc}] (${a.count})`);
}
if (failures.length > 0) {
  console.error(
    `\n${failures.length} alert(s) not accepted in ${rulesFile}: fix them, or add the rule with a reason.`,
  );
  process.exit(1);
}
