const assert = require("assert");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const dashboardPath = path.join(__dirname, "..", "index.html");
const html = fs.readFileSync(dashboardPath, "utf8");
const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>\s*<\/body>/);
if (!scriptMatch) throw new Error("No se encontro el script principal del dashboard.");

const initMarker = "document.addEventListener('keydown'";
const script = scriptMatch[1].slice(0, scriptMatch[1].indexOf(initMarker));
const fields = {
  "f-fecha-inicio": {value: ""},
  "f-fecha-fin": {value: ""},
  "f-ruta": {value: ""},
  "f-repartidor": {value: ""},
  "f-corte": {value: ""}
};
const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  document: {getElementById: id => fields[id] || {value: ""}}
});
vm.runInContext(script, context);

function evaluate(expression) {
  return JSON.parse(JSON.stringify(vm.runInContext(expression, context)));
}

vm.runInContext(`
  normalizeProducts([
    {productId:'GC001',name:'Chocolate',price:20},
    {productId:'GA002',name:'Ate',price:18}
  ]);
`, context);

const dynamicPricing = evaluate(`(() => {
  const visits=normalizeVisits([
    {visitId:'v1',date:'2026-07-22',routeId:'R1',storeId:'T1',repartidorId:'rep1',state:'Visitada',paymentMethod:'Efectivo'}
  ]);
  const details=normalizeDetails([
    {visitId:'v1',productId:'GC001',entregado:2,devolucion:0},
    {visitId:'v1',productId:'GA002',entregado:1,devolucion:0}
  ],visits);
  return buildFinancialGroups({visits,details,inventory:[],cuts:[]},{inicio:'2026-07-22',fin:'2026-07-22'})[0];
})()`);
assert.strictEqual(dynamicPricing.totalVendido, 58);
assert.strictEqual(dynamicPricing.efectivo, 58);
assert.strictEqual(dynamicPricing.pendiente, 0);
assert.strictEqual(dynamicPricing.reconciliado, true);
assert.strictEqual(dynamicPricing.fuenteFinanciera, "Visitas · preliminar");

const closedCut = evaluate(`(() => {
  const visits=normalizeVisits([
    {visitId:'v2',date:'2026-07-22',routeId:'R2',storeId:'T2',repartidorId:'rep2',state:'Visitada',paymentMethod:'Efectivo'}
  ]);
  const details=normalizeDetails([
    {visitId:'v2',productId:'GC001',entregado:2,devolucion:0,mtoCobrado:40}
  ],visits);
  const cuts=normalizeCuts([
    {corteId:'c2',date:'2026-07-22',routeId:'R2',repartidorId:'rep2',totalVendido:40,efectivoEsperado:30,transferenciaEsperada:10,pendienteEsperado:0,isClosed:true,estado:'CUADRA',updatedAt:2000}
  ]);
  return buildFinancialGroups({visits,details,inventory:[],cuts},{inicio:'2026-07-22',fin:'2026-07-22'})[0];
})()`);
assert.strictEqual(closedCut.efectivo, 30);
assert.strictEqual(closedCut.transferencia, 10);
assert.strictEqual(closedCut.pendiente, 0);
assert.strictEqual(closedCut.fuenteFinanciera, "Corte cerrado");
assert.strictEqual(closedCut.reconciliado, true);

const openCut = evaluate(`(() => {
  const visits=normalizeVisits([
    {visitId:'v3',date:'2026-07-22',routeId:'R3',storeId:'T3',repartidorId:'rep3',state:'Visitada',paymentMethod:'Transferencia'}
  ]);
  const details=normalizeDetails([
    {visitId:'v3',productId:'GA002',entregado:1,devolucion:0,mtoCobrado:18}
  ],visits);
  const cuts=normalizeCuts([
    {corteId:'c3',date:'2026-07-22',routeId:'R3',repartidorId:'rep3',totalVendido:0,efectivoEsperado:0,transferenciaEsperada:0,pendienteEsperado:0,isClosed:false,estado:'ABIERTO'}
  ]);
  return buildFinancialGroups({visits,details,inventory:[],cuts},{inicio:'2026-07-22',fin:'2026-07-22'})[0];
})()`);
assert.strictEqual(openCut.transferencia, 18);
assert.strictEqual(openCut.fuenteFinanciera, "Visitas · preliminar");
assert.strictEqual(openCut.reconciliado, true);

const duplicateCuts = evaluate(`(() => {
  const visits=normalizeVisits([
    {visitId:'v4',date:'2026-07-22',routeId:'R4',storeId:'T4',repartidorId:'rep4',state:'Visitada',paymentMethod:'Efectivo'}
  ]);
  const details=normalizeDetails([
    {visitId:'v4',productId:'GC001',entregado:1,devolucion:0,mtoCobrado:20}
  ],visits);
  const cuts=normalizeCuts([
    {corteId:'old',date:'2026-07-22',routeId:'R4',repartidorId:'rep4',totalVendido:20,efectivoEsperado:10,transferenciaEsperada:0,pendienteEsperado:10,isClosed:true,estado:'CUADRA',updatedAt:1000},
    {corteId:'new',date:'2026-07-22',routeId:'R4',repartidorId:'rep4',totalVendido:20,efectivoEsperado:20,transferenciaEsperada:0,pendienteEsperado:0,isClosed:true,estado:'CUADRA',updatedAt:2000}
  ]);
  return buildFinancialGroups({visits,details,inventory:[],cuts},{inicio:'2026-07-22',fin:'2026-07-22'})[0];
})()`);
assert.strictEqual(duplicateCuts.corte.CORTE_ID, "new");
assert.strictEqual(duplicateCuts.duplicateClosedCuts, true);
assert.strictEqual(duplicateCuts.alerts.some(message => message.includes("más de un corte")), true);

const pendingPayment = evaluate(`(() => {
  const visits=normalizeVisits([
    {visitId:'v5',date:'2026-07-22',routeId:'R5',storeId:'T5',repartidorId:'rep5',state:'Visitada',paymentMethod:'Pendiente'}
  ]);
  const details=normalizeDetails([
    {visitId:'v5',productId:'GA002',entregado:1,devolucion:0,mtoCobrado:18}
  ],visits);
  return buildFinancialGroups({visits,details,inventory:[],cuts:[]},{inicio:'2026-07-22',fin:'2026-07-22'})[0];
})()`);
assert.strictEqual(pendingPayment.efectivo, 0);
assert.strictEqual(pendingPayment.pendiente, 18);
assert.strictEqual(pendingPayment.reconciliado, true);

console.log("Dashboard finance tests: OK");
