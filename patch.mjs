import fs from 'fs';
import path from 'path';

// Helper to replace content in file
function replaceInFile(filePath, replacements) {
	if (!fs.existsSync(filePath)) {
		console.error(`File not found: ${filePath}`);
		return;
	}
	let content = fs.readFileSync(filePath, 'utf8');
	let originalContent = content;

	for (const { search, replace, description } of replacements) {
		if (content.includes(search)) {
			content = content.replace(search, replace);
			console.log(`[OK] Applied: ${description} in ${path.basename(filePath)}`);
		} else if (content.includes(replace)) {
			console.log(`[SKIP] Already applied: ${description} in ${path.basename(filePath)}`);
		} else {
			console.warn(`[WARN] Search text not found for: ${description} in ${path.basename(filePath)}`);
		}
	}

	if (content !== originalContent) {
		fs.writeFileSync(filePath, content, 'utf8');
	}
}

const rootDir = process.cwd();

// 1. Patch src/plus/gk/utils/subscription.utils.ts
const subUtilsPath = path.join(rootDir, 'src/plus/gk/utils/subscription.utils.ts');
if (fs.existsSync(subUtilsPath)) {
	let content = fs.readFileSync(subUtilsPath, 'utf8');

	// Replace computeSubscriptionState by swapping signature and appending shim
	const computeStateSig = `export function computeSubscriptionState(subscription: Optional<Subscription, 'state'>): SubscriptionState {`;
	if (content.includes(computeStateSig)) {
		content = content.replace(
			computeStateSig,
			`export function computeSubscriptionStateOriginal(subscription: Optional<Subscription, 'state'>): SubscriptionState {`,
		);

		// Append the new shim at the end of the file
		content += `
// Shim for computeSubscriptionState
export function computeSubscriptionState(_subscription: Optional<Subscription, 'state'>): SubscriptionState {
	return SubscriptionState.Paid;
}
`;
		console.log(`[OK] Applied: computeSubscriptionState patch`);
	} else if (content.includes('export function computeSubscriptionStateOriginal(')) {
		console.log(`[SKIP] Already applied: computeSubscriptionState patch`);
	} else {
		console.warn(`[WARN] computeSubscriptionState signature not found`);
	}

	// Replace isSubscriptionPaidPlan
	const isPaidRegex =
		/export function isSubscriptionPaidPlan\(id: SubscriptionPlanIds\): id is PaidSubscriptionPlanIds\s*\{[\s\S]*?\}/;
	if (isPaidRegex.test(content)) {
		content = content.replace(
			isPaidRegex,
			`export function isSubscriptionPaidPlan(_id: SubscriptionPlanIds): _id is PaidSubscriptionPlanIds {
	return true;
}`,
		);
		console.log(`[OK] Applied: isSubscriptionPaidPlan patch`);
	}

	// Replace getCommunitySubscription details
	if (content.includes("id: 'free-enterprise-user',")) {
		content = content
			.replace("name: 'Free Enterprise',", "name: 'Local Enterprise',")
			.replace("email: 'unlocked@example.com',", "email: 'unlocked@gitlens.local',");
		console.log(`[OK] Applied: getCommunitySubscription details update`);
	}

	fs.writeFileSync(subUtilsPath, content, 'utf8');
}

// 2. Patch src/plus/gk/subscriptionService.ts
const subServicePath = path.join(rootDir, 'src/plus/gk/subscriptionService.ts');
if (fs.existsSync(subServicePath)) {
	let content = fs.readFileSync(subServicePath, 'utf8');
	const forceEntRegex = /([\t ]*)subscription\s*\?\?=\s*\{/;
	if (forceEntRegex.test(content)) {
		content = content.replace(
			forceEntRegex,
			`$1// FORCE ENTERPRISE
$1if (subscription?.account == null || subscription.account.id === 'free-enterprise-user') {
$1    subscription = getCommunitySubscription(undefined);
$1} else {
$1    (subscription as Mutable<Subscription>).plan = {
$1        actual: getSubscriptionPlan('enterprise', false, 0, undefined),
$1        effective: getSubscriptionPlan('enterprise', false, 0, undefined),
$1    };
$1    subscription.state = SubscriptionState.Paid;
$1}
$1
$1subscription ??= {`,
		);
		fs.writeFileSync(subServicePath, content, 'utf8');
		console.log(`[OK] Applied: Force Enterprise plan in subscriptionService.ts`);
	} else {
		console.warn(`[WARN] Force Enterprise plan target not found in subscriptionService.ts`);
	}
}

// 3. Patch src/env/node/fetch.ts
replaceInFile(path.join(rootDir, 'src/env/node/fetch.ts'), [
	{
		description: 'Export Response/Headers values',
		search: `import fetch from 'node-fetch';`,
		replace: `import fetch, { Headers, Request, Response } from 'node-fetch';`,
	},
	{
		description: 'Export Response/Headers values (export)',
		search: `export { fetch };`,
		replace: `export { fetch, Headers, Request, Response };
export type FetchResponse = Response;`,
	},
	{
		description: 'Remove Response from type export',
		search: `export type { BodyInit, HeadersInit, RequestInfo, RequestInit, Response } from 'node-fetch';`,
		replace: `export type { BodyInit, HeadersInit, RequestInfo, RequestInit, Response } from 'node-fetch';`,
	},
]);

// 4. Patch src/env/browser/fetch.ts
replaceInFile(path.join(rootDir, 'src/env/browser/fetch.ts'), [
	{
		description: 'Export Response/Headers values and Types',
		search: `const fetch = globalThis.fetch;
export { fetch, fetch as insecureFetch };`,
		replace: `const { fetch, Response, Headers, Request } = globalThis;
export { fetch, fetch as insecureFetch, Response, Headers, Request };
export type Response = globalThis.Response;
export type Headers = globalThis.Headers;
export type Request = globalThis.Request;
export type FetchResponse = Response;`,
	},
	{
		description: 'Remove Response from type export (fix duplicate)',
		search: `	_Response as Response,`,
		replace: ``,
	},
]);

// 5. Patch src/plus/gk/serverConnection.ts
const serverConnPath = path.join(rootDir, 'src/plus/gk/serverConnection.ts');
if (fs.existsSync(serverConnPath)) {
	let serverConnContent = fs.readFileSync(serverConnPath, 'utf8');

	// Prepend eslint-disable to suppress all lint errors
	if (!serverConnContent.startsWith('/* eslint-disable */')) {
		serverConnContent = '/* eslint-disable */\n' + serverConnContent;
	}

	if (!serverConnContent.includes('// Mock checkin interception')) {
		serverConnContent = serverConnContent.replace(
			/import type \{ RequestInfo, RequestInit, Response \} from '@env\/fetch\.js';/g,
			'',
		);
		serverConnContent = serverConnContent.replace(
			/import type \{ RequestInfo, RequestInit, FetchResponse \} from '@env\/fetch\.js';/g,
			'',
		);
		serverConnContent = serverConnContent.replace(
			/import \{ fetch as _fetch, getProxyAgent \} from '@env\/fetch\.js';/g,
			'',
		);
		serverConnContent = serverConnContent.replace(
			/import \{ Headers as FetchHeaders, Response, fetch as _fetch, getProxyAgent \} from '@env\/fetch\.js';/g,
			'',
		);

		const importMark = `import { fetch as _fetch } from '@env/fetch.js';`;
		const cleanImports = `import { fetch as _fetch } from '@env/fetch.js';
import type { FetchResponse } from '@env/fetch.js';
const FetchHeaders = globalThis.Headers;
const Response = globalThis.Response;`;

		serverConnContent = serverConnContent.replace(importMark, cleanImports);

		const injectionPoint = `			const headers = await this.getGkHeaders(
				options?.token,
				options?.organizationId,
				init?.headers ? { ...(init?.headers as Record<string, string>) } : undefined,
			);`;

		const injectionCode = `
            // Mock checkin interception
            if (typeof url === 'string' && (url.includes('gitlens/checkin') || url.includes('/user/checkin'))) {
                const mockResponse = {
                    user: {
                        id: 'mock-user-id',
                        name: 'GitLens Developer',
                        email: 'developer@gitlens.local',
                        status: 'activated',
                        createdDate: new Date().toISOString(),
                        firstGitLensCheckIn: new Date().toISOString(),
                    },
                    licenses: {
                        effectiveLicenses: {
                            'gitlens-standalone-enterprise': {
                                latestStatus: 'active',
                                latestStartDate: new Date().toISOString(),
                                latestEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 99)).toISOString(),
                                organizationId: 'mock-org-id',
                                reactivationCount: 0
                            }
                        },
                        paidLicenses: {
                            'gitlens-standalone-enterprise': {
                                latestStatus: 'active',
                                latestStartDate: new Date().toISOString(),
                                latestEndDate: new Date(new Date().setFullYear(new Date().getFullYear() + 99)).toISOString(),
                                organizationId: 'mock-org-id',
                                reactivationCount: 0
                            }
                        }
                    },
                    nextOptInDate: new Date(new Date().setFullYear(new Date().getFullYear() + 99)).toISOString()
                };

                return new Response(JSON.stringify(mockResponse), {
                    status: 200,
                    statusText: 'OK',
                    headers: new FetchHeaders({ 'Content-Type': 'application/json' })
                });
            }

            if (typeof url === 'string' && (url.includes('user/reactivate-trial'))) {
                 return new Response(JSON.stringify({}), {
                    status: 200,
                    statusText: 'OK'
                });
            }`;

		if (serverConnContent.includes(injectionPoint)) {
			serverConnContent = serverConnContent.replace(injectionPoint, injectionPoint + injectionCode);
			fs.writeFileSync(serverConnPath, serverConnContent, 'utf8');
			console.log(`[OK] Applied: ServerConnection mock in ${path.basename(serverConnPath)}`);
		} else {
			console.error(`[ERR] Injection point not found in ${path.basename(serverConnPath)}`);
		}
	} else {
		console.log(`[SKIP] ServerConnection already patched`);
	}
}

// 6. Overwrite src/plus/gk/utils/-webview/acount.utils.ts
const accountUtilsPath = path.join(rootDir, 'src/plus/gk/utils/-webview/acount.utils.ts');
if (fs.existsSync(accountUtilsPath)) {
	const stubContent = `import type { Uri } from 'vscode';
import type { Source } from '../../../../constants.telemetry.js';
import type { Container } from '../../../../container.js';
import type { PlusFeatures } from '../../../../features.js';
import type { DirectiveQuickPickItem } from '../../../../quickpicks/items/directive.js';

export async function ensureAccount(_container: Container, _title: string, _source: Source): Promise<boolean> {
	await Promise.resolve();
	return true;
}

export async function ensureAccountQuickPick(
	_container: Container,
	_descriptionItem: DirectiveQuickPickItem,
	_source: Source,
	_silent?: boolean,
): Promise<boolean> {
	await Promise.resolve();
	return true;
}

export async function ensureFeatureAccess(
	_container: Container,
	_title: string,
	_feature: PlusFeatures,
	_source: Source,
	_repoPath?: string | Uri,
): Promise<boolean> {
	await Promise.resolve();
	return true;
}
`;
	fs.writeFileSync(accountUtilsPath, stubContent, 'utf8');
	console.log(`[OK] Overwritten: acount.utils.ts with stubs`);
}

// 7. Cleanup Documentation & Licenses
const filesToDelete = ['CODE_OF_CONDUCT.md', 'CONTRIBUTING.md', 'LICENSE.plus', 'BACKERS.md'];

for (const file of filesToDelete) {
	const filePath = path.join(rootDir, file);
	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
		console.log(`[OK] Deleted: ${file}`);
	}
}

console.log('Patching complete.');
