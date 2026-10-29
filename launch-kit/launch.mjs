// Deploys the $VETO token from YOUR computer. Your private key is typed here, kept in memory only,
// and never saved or sent anywhere except as a signed transaction to Robinhood Chain.
import { readFileSync } from 'node:fs';
import { createInterface } from 'node:readline';
import { createPublicClient, createWalletClient, http, defineChain, formatEther, getAddress, encodeAbiParameters } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

const LAUNCH_WALLET = getAddress('0xe1a133493be01d74e15ff2f1acb7f9740288db64');
const NETS = {
  mainnet: { id: 4663, name: 'Robinhood Chain', rpc: 'https://rpc.mainnet.chain.robinhood.com', explorer: 'https://robinhoodchain.blockscout.com' },
  testnet: { id: 46630, name: 'Robinhood Chain Testnet', rpc: 'https://rpc.testnet.chain.robinhood.com', explorer: 'https://explorer.testnet.chain.robinhood.com' },
  local: { id: 31337, name: 'Local test chain', rpc: 'http://127.0.0.1:8545', explorer: '' },
};
const net = NETS[process.argv[2] || 'testnet'];
if (!net) { console.log('Usage: node launch.mjs testnet   (practice)\n       node launch.mjs mainnet   (the real launch)'); process.exit(1); }
const token = JSON.parse(readFileSync(new URL('./token.json', import.meta.url)));

function askHidden(q) {
  return new Promise((res) => {
    const rl = createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(q)) rl.output.write(s); };
    rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); res(a.trim()); });
  });
}
const ask = (q) => new Promise((res) => { const rl = createInterface({ input: process.stdin, output: process.stdout }); rl.question(q, (a) => { rl.close(); res(a.trim()); }); });

console.log(`\n$VETO launcher: ${net.name}\nTokens go to (and launchWallet is): ${LAUNCH_WALLET}\n`);
let key = process.env.LAUNCH_KEY || await askHidden('Paste the launch wallet private key (hidden, not saved): ');
if (!key.startsWith('0x')) key = '0x' + key;
let account;
try { account = privateKeyToAccount(key); } catch { console.log('That is not a valid private key.'); process.exit(1); }
key = null;
if (account.address !== LAUNCH_WALLET) { console.log(`That key belongs to ${account.address}, not the launch wallet. Stopping.`); process.exit(1); }

const chain = defineChain({ id: net.id, name: net.name, nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 }, rpcUrls: { default: { http: [net.rpc] } } });
const pub = createPublicClient({ chain, transport: http() });
const wallet = createWalletClient({ account, chain, transport: http() });
const live = await pub.getChainId();
if (live !== net.id) { console.log(`RPC answered chain ${live}, expected ${net.id}. Stopping.`); process.exit(1); }
const bal = await pub.getBalance({ address: LAUNCH_WALLET });
console.log(`Wallet balance: ${formatEther(bal)} ETH`);
if (bal === 0n) { console.log(net.id === 46630 ? 'No test ETH. Get some at https://faucet.testnet.chain.robinhood.com/ and run again.' : 'No ETH on Robinhood Chain for gas. Send a little ETH to this wallet on Robinhood Chain and run again.'); process.exit(1); }
if ((await ask(`Deploy $VETO on ${net.name} now? Type YES: `)) !== 'YES') { console.log('Cancelled.'); process.exit(0); }

const hash = await wallet.deployContract({ abi: token.abi, bytecode: token.bytecode, args: [LAUNCH_WALLET] });
console.log(`Sent: ${hash}\nWaiting for confirmation…`);
const rc = await pub.waitForTransactionReceipt({ hash });
if (rc.status !== 'success') { console.log('Deploy failed on-chain.'); process.exit(1); }
const ca = getAddress(rc.contractAddress);
const read = (functionName, args = []) => pub.readContract({ address: ca, abi: token.abi, functionName, args });
const [sym, sup, held, lw] = await Promise.all([read('symbol'), read('totalSupply'), read('balanceOf', [LAUNCH_WALLET]), read('launchWallet')]);
console.log(`\n✅ DEPLOYED\nCA (contract address): ${ca}`);
console.log(`  ✓ ticker ${sym}, supply ${Number(formatEther(sup)).toLocaleString()}`);
console.log(`  ${held === sup ? '✓' : '✗'} launch wallet holds 100%`);
console.log(`  ${getAddress(lw) === LAUNCH_WALLET ? '✓' : '✗'} launchWallet = ${lw}`);
if (net.explorer) console.log(`  Explorer: ${net.explorer}/address/${ca}`);

if (!net.explorer) process.exit(0);
console.log('\nPublishing source code (verification)…');
const api = async (params, method = 'POST') => {
  const body = new URLSearchParams(params);
  const r = method === 'POST' ? await fetch(`${net.explorer}/api`, { method, body }) : await fetch(`${net.explorer}/api?${body}`);
  const t = await r.text(); try { return JSON.parse(t); } catch { return { status: '0', result: t.slice(0, 200) }; }
};
const args = encodeAbiParameters([{ type: 'address' }], [LAUNCH_WALLET]).slice(2);
for (let attempt = 1; attempt <= 6; attempt++) {
  await new Promise((r) => setTimeout(r, 10000));
  try {
    const sub = await api({ module: 'contract', action: 'verifysourcecode', codeformat: 'solidity-standard-json-input', contractaddress: ca, contractname: 'src/VetoToken.sol:VetoToken', compilerversion: 'v0.8.28+commit.7893614a', sourceCode: readFileSync(new URL('./verify-input.json', import.meta.url), 'utf8'), constructorArguements: args, licenseType: '3' });
    if (sub.status !== '1') { if (/already verified/i.test(sub.result)) { console.log('✅ VERIFIED (already)'); process.exit(0); } console.log(`  try ${attempt}: ${sub.result}`); continue; }
    for (let i = 0; i < 20; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const c = await api({ module: 'contract', action: 'checkverifystatus', guid: sub.result }, 'GET');
      if (/pass|verified/i.test(c.result)) { console.log(`✅ VERIFIED: ${net.explorer}/address/${ca}?tab=contract`); process.exit(0); }
      if (!/pending|queue/i.test(c.result)) { console.log(`  try ${attempt}: ${c.result}`); break; }
    }
  } catch (e) { console.log(`  try ${attempt}: ${e.message}`); }
}
console.log('Could not verify automatically. Send the CA to Claude; the token is deployed fine either way.');
