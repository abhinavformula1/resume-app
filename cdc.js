const fs = require('fs');
const jsforce = require('jsforce');

const conn = new jsforce.Connection({
  loginUrl: 'https://test.salesforce.com'
});

const username = 't-akumar9@supplier.pldt.com.ph.tfxnfdev01';
const password = '@Ironman8TOfW6Gg14KKs3Olq1jSemlsGD';

async function run() {
  try {
    await conn.login(username, password);
    console.log('Connected for CDC');

    const channel = '/data/AccountChangeEvent';
    const client = conn.streaming.createClient();

    if (!fs.existsSync('accounts.csv')) {
      fs.writeFileSync('accounts.csv', 'Name,Source,CreatedDate\n');
    }

    client.subscribe(channel, message => {
      if (!message?.data?.payload) return;

      const data = message.data.payload;

      console.log('REAL EVENT:', data.ChangeEventHeader?.changeType);

      const line = `${data.Name || ''},${data.AccountSource || ''},${data.CreatedDate || ''}\n`;
      fs.appendFileSync('accounts.csv', line);

      console.log('Written:', line);
    });

    console.log('Listening to Account changes...');

  } catch (err) {
    console.error('ERROR:', err);
  }
}

run();