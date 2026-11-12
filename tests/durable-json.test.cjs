const {test}=require('node:test'),assert=require('node:assert/strict');
const {createDurableJsonIO}=require(process.env.DURABLE_IO_MODULE||'../src/api/durable-json.ts');
const file='/data/storage/petal/siyuan-speed-switch/external-command-journal.json';
test('only explicit 404 is missing; invalid, empty, permission and network failures stay errors',async()=>{
    assert.equal((await createDurableJsonIO(async()=>new Response('',{status:404})).read(file)).kind,'missing');
    for(const response of [()=>new Response(''),()=>new Response('no',{status:403}),()=>new Response('not-json'),()=>new Response('{"code":-1}'),()=>{throw Error('network');}])await assert.rejects(()=>createDurableJsonIO(async()=>response()).read(file));
});
test('reservation write requires code zero and independent no-cache disk readback',async()=>{
    for(const mode of ['code','read-fail','mismatch']){
        let gets=0;const io=createDurableJsonIO(async(url,init)=>{if(url.endsWith('putFile'))return new Response(JSON.stringify({code:mode==='code'?-1:0}));gets++;assert.equal(init.cache,'no-store');return mode==='read-fail'?new Response('',{status:503}):new Response('["wrong"]');});
        await assert.rejects(()=>io.write(file,[]));assert.equal(gets,mode==='code'?0:1);
    }
    let gets=0;await createDurableJsonIO(async(url,init)=>{if(url.endsWith('putFile'))return new Response('{"code":0}');gets++;return new Response('[]');}).write(file,[]);assert.equal(gets,1);
});
