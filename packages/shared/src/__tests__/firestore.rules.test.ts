/**
 * @jest-environment node
 */
import {
	assertFails,
	assertSucceeds,
	initializeTestEnvironment,
	type RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import {
	doc,
	getDoc,
	serverTimestamp,
	setDoc,
	updateDoc,
} from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const describeIfEmulator = process.env.FIRESTORE_EMULATOR_HOST ? describe : describe.skip;

describeIfEmulator('Firestore rules ledger boundary', () => {
	let testEnv: RulesTestEnvironment;

	const validAccount = {
		userId: 'alice',
		name: 'Main Account',
		type: 'debit',
		currency: 'ZAR',
		balance: 1000,
		createdAt: serverTimestamp(),
	};

	const validTransaction = {
		userId: 'alice',
		accountId: 'account-1',
		title: 'Groceries',
		amount: 250,
		type: 'expense',
		category: 'food',
		createdAt: serverTimestamp(),
	};

	beforeAll(async () => {
		testEnv = await initializeTestEnvironment({
			projectId: 'cash-flow-rules-test',
			firestore: {
				rules: readFileSync('firestore.rules', 'utf8'),
			},
		});
	});

	beforeEach(async () => {
		await testEnv.clearFirestore();
	});

	afterAll(async () => {
		await testEnv.cleanup();
	});

	const authedDb = (uid: string) => testEnv.authenticatedContext(uid).firestore();

	async function seedAliceLedger() {
		await testEnv.withSecurityRulesDisabled(async (context) => {
			const db = context.firestore();
			await setDoc(doc(db, 'users/alice/accounts/account-1'), validAccount);
			await setDoc(doc(db, 'users/alice/transactions/transaction-1'), validTransaction);
		});
	}

	it('prevents one user from reading another user account', async () => {
		await seedAliceLedger();

		await assertFails(getDoc(doc(authedDb('bob'), 'users/alice/accounts/account-1')));
	});

	it('allows account metadata updates while preserving balance', async () => {
		await seedAliceLedger();

		await assertSucceeds(
			updateDoc(doc(authedDb('alice'), 'users/alice/accounts/account-1'), {
				name: 'Daily Account',
			})
		);
	});

	it('blocks direct browser balance updates', async () => {
		await seedAliceLedger();

		await assertFails(
			updateDoc(doc(authedDb('alice'), 'users/alice/accounts/account-1'), {
				balance: 2000,
			})
		);
	});

	it('blocks direct browser transaction creation', async () => {
		await assertFails(
			setDoc(
				doc(authedDb('alice'), 'users/alice/transactions/transaction-2'),
				validTransaction
			)
		);
	});

	it('allows safe transaction categorisation updates only', async () => {
		await seedAliceLedger();

		await assertSucceeds(
			updateDoc(doc(authedDb('alice'), 'users/alice/transactions/transaction-1'), {
				category: 'home',
				subcategory: 'supplies',
			})
		);
		await assertFails(
			updateDoc(doc(authedDb('alice'), 'users/alice/transactions/transaction-1'), {
				amount: 500,
			})
		);
	});
});
