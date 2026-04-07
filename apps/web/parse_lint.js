const fs = require('fs');
const data = JSON.parse(fs.readFileSync('lint-results.json', 'utf-8'));
data.filter(f => f.errorCount > 0 || f.warningCount > 0).forEach(f => {
  console.log('File: ' + f.filePath);
  f.messages.forEach(m => console.log('  Line ' + m.line + ': ' + m.message + ' (' + m.ruleId + ')'));
});
