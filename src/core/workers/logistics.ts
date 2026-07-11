/**
 * Agent B · Logistics Guru.
 *
 * Wraps the dynamic revision loop: calculates time buffers and filters out
 * closures / bad vectors autonomously. Shared by planner and concierge.
 */

import type { PatchOp, TravellerProfile } from "../../shared/schemas.js";
import {
  runRevisionLoop,
  type RevisionContext,
  type RevisionResult,
} from "../revision-loop.js";

export interface Logistics {
  revise(
    profile: TravellerProfile,
    ops: PatchOp[],
    ctx: RevisionContext,
  ): Promise<RevisionResult>;
}

export class DefaultLogistics implements Logistics {
  async revise(
    profile: TravellerProfile,
    ops: PatchOp[],
    ctx: RevisionContext,
  ): Promise<RevisionResult> {
    // TODO(Agent B): fetch live closures + travel times before the loop.
    return runRevisionLoop(profile, ops, ctx);
  }
}

export function createLogistics(): Logistics {
  return new DefaultLogistics();
}
