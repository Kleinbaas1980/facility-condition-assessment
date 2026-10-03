import test from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword,verifyPassword,digest,randomToken,constantEqual } from '../src/utils/crypto.js';
import { password } from '../src/validation/auth.js';
test('salted passwords verify and wrong passwords fail',async()=>{const first=await hashPassword('StrongPassword1!');const second=await hashPassword('StrongPassword1!');assert.notEqual(first,second);assert.equal(await verifyPassword('StrongPassword1!',first),true);assert.equal(await verifyPassword('wrong',first),false);assert.equal(await verifyPassword('StrongPassword1!','not-a-hash'),false)});
test('strong-password policy rejects weak combinations',()=>{for(const value of ['lowercase1!abc','UPPERCASE1!ABC','NoNumbersHere!','NoSymbols12345','Short1!'])assert.equal(password.safeParse(value).success,false);assert.equal(password.safeParse('StrongPassword1!').success,true)});
test('opaque tokens are unique and digests never expose them',()=>{const a=randomToken(),b=randomToken();assert.notEqual(a,b);assert.equal(digest(a).length,64);assert.notEqual(digest(a),a);assert.equal(constantEqual(a,a),true);assert.equal(constantEqual(a,b),false);assert.equal(constantEqual('a','longer'),false)});
