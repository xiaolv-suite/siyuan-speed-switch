const {test}=require('node:test');
const assert=require('node:assert/strict');
const {createExternalCommandReceiver,mountExternalCommandTransport,publishExternalReceipt}=require(process.env.RAIKIRI_RECEIVER_MODULE || '../src/api/external-command-receiver.ts');
test('navigation allowlist matches the actual sibling command registrations',(t)=>{
    const fs=require('node:fs'),path=require('node:path');
    const files=[['siyuan-checkin','小驴打卡/src/features/quick-entry-capabilities.ts',['openCheckin','openCheckinTab']],['siyuan-contacts','小驴人脉/siyuan-contacts/src/index.ts',['openWorkbench']],['siyuan-home','小驴管家/src/core/plugin-entrypoints.ts',['openButler']],['siyuan-glean','小驴拾遗/src/index.ts',['cmd.openPanel']],['siyuan-exam','小驴考试/src/index.ts',['command.openPractice','command.openWrongbook','command.openReport']],['siyuan-lv-cards','小驴闪卡/src/bootstrap/commands.ts',['openDashboard','openManager','startReview']],['xiaolv-common','小驴常用/src/index.ts',['open']]];
    const {isExternalNavigationCommand}=require(process.env.RAIKIRI_RECEIVER_MODULE || '../src/api/external-command-receiver.ts');
    if(files.some(([,file])=>!fs.existsSync(path.resolve(__dirname,'../..',file))))return t.skip('Sibling checkouts unavailable for joint source contract');
    const ts=require('typescript');
    for(const [plugin,file,keys]of files){const full=path.resolve(__dirname,'../..',file);const source=ts.createSourceFile(full,fs.readFileSync(full,'utf8'),ts.ScriptTarget.Latest,true);const declared=new Set();const visit=node=>{if(ts.isPropertyAssignment(node)&&node.name.getText(source)==='langKey'&&ts.isStringLiteral(node.initializer))declared.add(node.initializer.text);ts.forEachChild(node,visit);};visit(source);for(const key of keys){assert.ok(declared.has(key),`${plugin} owns ${key}`);assert.equal(isExternalNavigationCommand(plugin,key),true);}}
    assert.equal(isExternalNavigationCommand('siyuan-home','openHub'),false);
});
test('external transport authenticates policy/TTL, reserves before effects, and deduplicates across restart',async()=>{
    const now=Date.parse('2026-11-09T12:00:00+08:00');let journal=null,calls=0;const receipts=[];
    const policy={enabled:true,allowNavigation:true,allowWrites:false};
    const deps={now:()=>now,policy:()=>policy,load:async()=>journal,save:async rows=>{journal=JSON.parse(JSON.stringify(rows));},publish:async r=>{receipts.push(r);},execute:async()=>{calls++;assert.equal(journal[0].receipt.status,'unknown');return {ok:true,data:[]};}};
    let receiver=createExternalCommandReceiver(deps);
    const envelope={v:1,id:'audit-1',op:'commands.list',args:{},createdAt:new Date(now).toISOString(),ttlMs:60000};
    assert.equal((await receiver.submit(envelope)).status,'recorded');assert.equal(calls,1);
    assert.equal((await receiver.submit(JSON.stringify(envelope))).status,'recorded');assert.equal(calls,1);
    receiver=createExternalCommandReceiver(deps);await receiver.submit(envelope);assert.equal(calls,1);
    assert.equal((await receiver.submit({...envelope,args:{other:true}})).message,'request-id-conflict');
    assert.equal((await receiver.submit({...envelope,id:'expired',createdAt:new Date(now-60001).toISOString()})).status,'expired');
    assert.equal((await receiver.submit({...envelope,id:'write',op:'checkin.record'})).message,'writes-disabled');
    assert.equal((await receiver.submit({...envelope,id:'arbitrary',op:'commands.run',args:{plugin:'arbitrary',command:'delete'}})).message,'command-not-allowlisted');
    assert.equal(calls,1);policy.enabled=false;await receiver.submit({...envelope,id:'disabled'});assert.equal(calls,1);
    assert.ok(receipts.length>=5);
});
test('SSE and fixed NDJSON transports share identity and persist compatible receipts; disabled is silent',async()=>{
    const originalFetch=global.fetch,originalSource=global.EventSource;
    let source,requests=[],journal=null,executions=0,resultText='';
    const envelope={v:1,id:'transport-1',op:'commands.list',args:{},createdAt:new Date().toISOString(),ttlMs:60000};
    global.EventSource=class {constructor(url){this.url=url;source=this;}addEventListener(name,handler){this.named=name;this.handler=handler;}close(){this.closed=true;}};
    global.fetch=async(url,options)=>{
        requests.push(String(url));
        if(url==='/api/file/putFile'){resultText=await options.body.get('file').text();return new Response(JSON.stringify({code:0}));}
        const target=JSON.parse(options.body).path;
        return new Response(target.endsWith('commands.ndjson')?JSON.stringify(envelope)+'\n':resultText);
    };
    try{
        let enabled=false;
        const make=()=>createExternalCommandReceiver({policy:()=>({enabled,allowNavigation:false,allowWrites:false}),load:async()=>journal,save:async v=>{journal=JSON.parse(JSON.stringify(v));},execute:async()=>{executions++;return {ok:true};},publish:publishExternalReceipt});
        let cleanup=mountExternalCommandTransport(make(),()=>enabled);assert.equal(requests.length,0);assert.equal(source,undefined);cleanup();
        enabled=true;cleanup=mountExternalCommandTransport(make(),()=>enabled);
        assert.equal(source.url,'/es/broadcast/subscribe?channel=qg-cmd');
        assert.equal(source.named,'qg-cmd');source.handler({data:JSON.stringify(envelope)});
        await new Promise(resolve=>setTimeout(resolve,35));
        assert.equal(executions,1);assert.equal(JSON.parse(resultText.trim().split('\n').at(-1)).status,'recorded');
        assert.ok(requests.every(url=>['/api/file/getFile','/api/file/putFile'].includes(url)));
        cleanup();assert.equal(source.closed,true);
    }finally{global.fetch=originalFetch;global.EventSource=originalSource;}
});
test('failed reservation never executes; unknown side effect is never replayed',async()=>{
    const now=Date.now(),envelope={v:1,id:'audit-unknown',op:'commands.list',args:{},createdAt:new Date(now).toISOString(),ttlMs:60000};
    let journal=null,calls=0,fail=true;
    const deps={policy:()=>({enabled:true,allowNavigation:true,allowWrites:false}),load:async()=>journal,save:async rows=>{if(fail)throw Error('disk');journal=JSON.parse(JSON.stringify(rows));},publish:async()=>{},execute:async()=>{calls++;throw Error('receipt unknown');}};
    const receiver=createExternalCommandReceiver(deps);assert.equal((await receiver.submit(envelope)).message,'reservation-persist-failed');assert.equal(calls,0);
    fail=false;assert.equal((await receiver.submit(envelope)).status,'unknown');assert.equal(calls,1);
    await createExternalCommandReceiver(deps).submit(envelope);assert.equal(calls,1);
});
