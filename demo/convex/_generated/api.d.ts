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
import type * as daytona from "../daytona.js";
import type * as daytona_getStringLength from "../daytona/getStringLength.js";
import type * as daytonaManifest from "../daytonaManifest.js";
import type * as events from "../events.js";
import type * as facts from "../facts.js";
import type * as http from "../http.js";
import type * as jobs from "../jobs.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  bundled: typeof bundled;
  daytona: typeof daytona;
  "daytona/getStringLength": typeof daytona_getStringLength;
  daytonaManifest: typeof daytonaManifest;
  events: typeof events;
  facts: typeof facts;
  http: typeof http;
  jobs: typeof jobs;
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
  daytona: import("@convex-dev/daytona/_generated/component.js").ComponentApi<"daytona">;
};
