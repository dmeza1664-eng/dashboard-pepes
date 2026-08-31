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
  "f-date-mode": {value: "day"},
  "f-fecha-inicio": {value: ""},
  "f-fecha-fin": {value: ""},
  "f-fecha-inicio-label": {textContent: ""},
  "f-fecha-fin-label": {textContent: ""},
  "f-ruta": {value: ""},
  "f-repartidor": {value: ""},
  "f-corte": {value: ""}
};
const alertMessages = [];
const context = vm.createContext({
  console,
  setTimeout,
  clearTimeout,
  alert: message => alertMessages.push(message),
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

fields["f-fecha-inicio"].value = "2026-07-02";
fields["f-fecha-fin"].value = "2026-07-21";
fields["f-date-mode"].value = "day";
assert.deepStrictEqual(evaluate("rangoFechasSeleccionado()"), {inicio: "2026-07-02", fin: "2026-07-02"});
assert.strictEqual(evaluate("etiquetaRango('2026-07-02','2026-07-02')"), "Día · 02/07/2026");

fields["f-date-mode"].value = "range";
assert.deepStrictEqual(evaluate("rangoFechasSeleccionado()"), {inicio: "2026-07-02", fin: "2026-07-21"});
assert.strictEqual(evaluate("diasIncluidos('2026-07-02','2026-07-21')"), 20);
assert.strictEqual(evaluate("etiquetaRango('2026-07-02','2026-07-21')"), "Acumulado · 02/07/2026 al 21/07/2026 · 20 días");

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

(async () => {
  assert.match(html, /setPersistence\(firebase\.auth\.Auth\.Persistence\.SESSION\)/);
  assert.match(html, /auth\.onIdTokenChanged/);
  assert.match(html, /Content-Security-Policy/);
  assert.match(html, /\.dashboard-shell\{display:none\}/);
  assert.doesNotMatch(html, /onclick="seleccionarFechaConDatos\('\$\{sugerida\}'\)"/);
  assert.doesNotMatch(html, /\$\{info\.nombre\}<\/div><div class="tm"/);
  assert.strictEqual(evaluate("DASHBOARD_ALLOWED_ROLES.has('Administrador')"), true);
  assert.strictEqual(evaluate("DASHBOARD_ALLOWED_ROLES.has('Supervisor')"), true);
  assert.strictEqual(evaluate("DASHBOARD_ALLOWED_ROLES.has('Contadora')"), true);
  assert.strictEqual(evaluate("DASHBOARD_ALLOWED_ROLES.has('Repartidor')"), false);
  assert.strictEqual(evaluate("DASHBOARD_ALLOWED_USER_IDS.has('admin1')"), true);
  assert.strictEqual(evaluate("DASHBOARD_ALLOWED_USER_IDS.has('carloszerme1')"), true);
  assert.strictEqual(evaluate("DASHBOARD_ALLOWED_USER_IDS.has('goreti')"), false);

  fields["f-date-mode"].value = "range";
  fields["f-fecha-inicio"].value = "2026-07-02";
  fields["f-fecha-fin"].value = "2026-07-21";
  assert.deepStrictEqual(evaluate("rangoConsultaFirestore()"), {
    inicio: "2026-06-25",
    fin: "2026-07-21",
    visibleInicio: "2026-07-02",
    visibleFin: "2026-07-21"
  });
  fields["f-fecha-fin"].value = "2026-08-21";
  assert.throws(() => vm.runInContext("rangoConsultaFirestore()", context), /rango máximo/i);
  assert.deepStrictEqual(evaluate("dividirEnLotes(Array.from({length:65},(_,i)=>i),FIRESTORE_IN_LIMIT).map(x=>x.length)"), [30, 30, 5]);
  assert.strictEqual(evaluate("esc('<img src=x onerror=alert(1)>')"), "&lt;img src=x onerror=alert(1)&gt;");

  vm.runInContext(`
    db={collection:()=>({doc:()=>({get:async()=>({
      exists:true,
      data:()=>({role:'Administrador',isActive:true,authUid:'auth-1'})
    })})})};
  `, context);
  const allowed = await vm.runInContext(`validateDashboardAccess({
    uid:'auth-1',
    getIdTokenResult:async()=>({claims:{userId:'admin1',role:'Administrador'}})
  })`, context);
  assert.strictEqual(allowed.role, "Administrador");

  vm.runInContext(`
    db={collection:()=>({doc:()=>({get:async()=>({
      exists:true,
      data:()=>({role:'Supervisor',isActive:true,authUid:'auth-1'})
    })})})};
  `, context);
  await assert.rejects(
    vm.runInContext(`validateDashboardAccess({
      uid:'auth-1',
      getIdTokenResult:async()=>({claims:{userId:'goreti',role:'Supervisor'}})
    })`, context),
    /no tiene acceso/i
  );

  vm.runInContext(`
    db={collection:()=>({doc:()=>({get:async()=>({
      exists:true,
      data:()=>({role:'Repartidor',isActive:true,authUid:'auth-1'})
    })})})};
  `, context);
  await assert.rejects(
    vm.runInContext(`validateDashboardAccess({
      uid:'auth-1',
      getIdTokenResult:async()=>({claims:{userId:'user-1',role:'Repartidor'}})
    })`, context),
    /no tiene acceso/i
  );

  vm.runInContext(`
    db={collection:()=>({doc:()=>({get:async()=>({
      exists:true,
      data:()=>({role:'Administrador',isActive:false,authUid:'auth-1'})
    })})})};
  `, context);
  await assert.rejects(
    vm.runInContext(`validateDashboardAccess({
      uid:'auth-1',
      getIdTokenResult:async()=>({claims:{userId:'admin1',role:'Administrador'}})
    })`, context),
    /desactivada/i
  );

  const unsubscribed = evaluate(`(() => {
    let count=0;
    realtimeUnsubscribers=[()=>count++,()=>count++];
    realtimeDetailUnsubscribers=[()=>count++];
    detenerActualizacionTiempoReal();
    return {count,live:realtimeUnsubscribers.length,details:realtimeDetailUnsubscribers.length};
  })()`);
  assert.deepStrictEqual(unsubscribed, {count: 3, live: 0, details: 0});

  assert.deepStrictEqual(evaluate(`(() => {
    realtimeErrors=new Set(['users']);
    return coleccionesBloqueantes();
  })()`), []);
  assert.deepStrictEqual(evaluate(`(() => {
    realtimeErrors=new Set(['users','visits']);
    return coleccionesBloqueantes();
  })()`), ["visits"]);
  vm.runInContext("realtimeErrors=new Set();", context);

  alertMessages.length = 0;
  vm.runInContext("dataReady=false; exportarExcel();", context);
  assert.match(alertMessages[0], /incompleta/i);

  console.log("Dashboard finance and hardening tests: OK");
})().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
