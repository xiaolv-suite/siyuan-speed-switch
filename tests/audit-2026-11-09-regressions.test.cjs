const {test}=require('node:test');
const assert=require('node:assert/strict');
const bridge=require(process.env.RAIKIRI_CHECKIN_MODEL || '../src/checkin-bridge-model.js');
test('uses provider daily authority and retains a current event beyond 4000 history rows',()=>{
    const now=new Date(2026,10,9,12).getTime();
    const events=Array.from({length:4000},()=>({itemId:'a',localDate:'2026-01-01',value:1})).concat([{itemId:'a',localDate:'2026-11-09',value:1}]);
    const api={protocol:'siyuan-checkin',hasCapability:()=>true,getItems:()=>[{id:'a',name:'a',target:1}],getEvents:()=>events,getDailyProjection:()=>({date:'2026-11-09',items:[{itemId:'a',name:'a',value:0,target:3,unit:'次',completed:true}],totalItems:1,truncated:false})};
    const snapshot=bridge.readCheckinBridge('checkin-today',{scope:{siyuanCheckin:api},now});
    assert.equal(snapshot.items[0].done,true,'atMost result is supplied, not recomputed');
    const monthly=bridge.readCheckinBridge('checkin-monthly',{scope:{siyuanCheckin:api},now});
    assert.equal(monthly.stat.value,'1/30','filter desired period before any display cap');
    api.getDailyProjection=()=>({date:'2026-11-09',items:[],totalItems:1001,truncated:true});
    assert.equal(bridge.readCheckinBridge('checkin-today',{scope:{siyuanCheckin:api},now}).status,'error','truncation must be explicit');
});
test('plugin command preserves owner and observes asynchronous errors',async()=>{
    const {runPluginCommand}=require(process.env.RAIKIRI_COMMAND_MODULE || '../src/api/plugin-command.ts');
    let called='';const plugins=[{name:'wrong',commands:[{langKey:'same',callback:()=>{called='wrong';}}]},{name:'right',commands:[{langKey:'same',callback:async()=>{called='right';}}]}];
    assert.equal((await runPluginCommand(plugins,'right','same')).ok,true);assert.equal(called,'right');
    plugins[1].commands[0].callback=async()=>{throw Error('async failed');};
    assert.equal((await runPluginCommand(plugins,'right','same')).ok,false);
    assert.equal((await runPluginCommand(plugins,'missing','same')).ok,false);
});
