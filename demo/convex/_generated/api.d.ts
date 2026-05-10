/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as bundled from "../bundled.js";
import type * as events from "../events.js";
import type * as facts from "../facts.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";
import type * as remote from "../remote.js";
import type * as remote__generated_manifest from "../remote/_generated/manifest.js";
import type * as remote_getStringLength from "../remote/getStringLength.js";
import type * as remoteHelpers from "../remoteHelpers.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bundled: typeof bundled;
  events: typeof events;
  facts: typeof facts;
  http: typeof http;
  jobs: typeof jobs;
  remote: typeof remote;
  "remote/_generated/manifest": typeof remote__generated_manifest;
  "remote/getStringLength": typeof remote_getStringLength;
  remoteHelpers: typeof remoteHelpers;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {
  remoteRunner: import("@convex-dev/remote-runner/_generated/component.js").ComponentApi<"remoteRunner">;
};
