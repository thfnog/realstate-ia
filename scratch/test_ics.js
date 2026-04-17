const mock = require('./src/lib/mockDb');

function formatDateICS(dateStr, addHours = 0) {
  const d = new Date(dateStr);
  d.setHours(d.getHours() + addHours);
  return d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
}

function formatDateOnlyICS(dateStr) {
  return dateStr.replace(/-/g, '');
}

mock.seedTestData();
const corretores = mock.getCorretores();
const target = corretores[0];

console.log('Testing for Corretor:', target.nome, 'ID:', target.id);

const eventos = mock.getEventos().filter(e => e.corretor_id === target.id);
const escala = mock.getEscala().filter(e => e.corretor_id === target.id);

console.log('Found Events:', eventos.length);
console.log('Found Escala:', escala.length);

let ics = 'BEGIN:VCALENDAR\n';
for (const evt of eventos) {
  const start = formatDateICS(evt.data_hora);
  ics += `BEGIN:VEVENT\nSUMMARY:${evt.titulo}\nDTSTART:${start}\nEND:VEVENT\n`;
}
for (const esc of escala) {
  const date = formatDateOnlyICS(esc.data);
  ics += `BEGIN:VEVENT\nSUMMARY:PLANTÃO\nDTSTART;VALUE=DATE:${date}\nEND:VEVENT\n`;
}
ics += 'END:VCALENDAR';

console.log('--- ICS PREVIEW ---');
console.log(ics);
console.log('--- END PREVIEW ---');
