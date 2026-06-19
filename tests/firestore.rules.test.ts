import fs from 'node:fs';
import path from 'node:path';
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, writeBatch } from 'firebase/firestore';

const projectId = 'cash-flow-security-tests';
let environment: RulesTestEnvironment;

beforeAll(async () => {
	environment = await initializeTestEnvironment({
		projectId,
		firestore: { rules: fs.readFileSync(path.resolve('firestore.rules'), 'utf8') },
	});
});

beforeEach(async () => {
	await environment.withSecurityRulesDisabled(async (context) => {
		await setDoc(doc(context.firestore(), 'users/alice/accounts/account-1'), {
			userId: 'alice', name: 'Main', type: 'debit', currency: 'ZAR', balance: 100,
			createdAt: new Date(),
		});
		await setDoc(doc(context.firestore(), 'users/alice/transactions/transaction-1'), {
			userId: 'alice', accountId: 'account-1', title: 'Opening', amount: 100,
			type: 'income', category: 'other', createdAt: new Date(),
		});
	});
});

afterEach(async () => environment.clearFirestore());
afterAll(async () => environment.cleanup());

const verified = (uid: string) => environment.authenticatedContext(uid, {
	email: `${uid}@example.com`, email_verified: true,
}).firestore();

it('allows a verified owner to read their financial records', async () => {
	await assertSucceeds(getDoc(doc(verified('alice'), 'users/alice/accounts/account-1')));
});

it('denies unverified and cross-user reads', async () => {
	const unverified = environment.authenticatedContext('alice', { email_verified: false }).firestore();
	await assertFails(getDoc(doc(unverified, 'users/alice/accounts/account-1')));
	await assertFails(getDoc(doc(verified('bob'), 'users/alice/accounts/account-1')));
});

it('denies direct balance tampering and transaction deletion', async () => {
	const firestore = verified('alice');
	await assertFails(updateDoc(doc(firestore, 'users/alice/accounts/account-1'), { balance: 999999 }));
	const batch = writeBatch(firestore);
	batch.delete(doc(firestore, 'users/alice/transactions/transaction-1'));
	await assertFails(batch.commit());
});

it('denies partial or complete transfer writes from the client', async () => {
	const firestore = verified('alice');
	const transfer = {
		userId: 'alice', accountId: 'account-1', transferAccountId: 'account-2',
		transferId: 'pair-1', transferDirection: 'out', title: 'Transfer', amount: 20,
		type: 'transfer', category: 'transfer', createdAt: new Date(),
	};
	await assertFails(setDoc(doc(firestore, 'users/alice/transactions/transfer-out'), transfer));
});
