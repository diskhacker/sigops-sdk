import type { LintRule } from '../engine.js';
import { noEmptyMonitor } from './no-empty-monitor.js';
import { noEmptyAlert } from './no-empty-alert.js';
import { noEmptyAction } from './no-empty-action.js';
import { requireThreshold } from './require-threshold.js';
import { requireInterval } from './require-interval.js';
import { requireAction } from './require-action.js';
import { noDuplicateNames } from './no-duplicate-names.js';
import { maxBlockDepth } from './max-block-depth.js';
import { validDuration } from './valid-duration.js';
import { noUnusedAction } from './no-unused-action.js';

/** All built-in lint rules. */
export const defaultRules: LintRule[] = [
  noEmptyMonitor,
  noEmptyAlert,
  noEmptyAction,
  requireThreshold,
  requireInterval,
  requireAction,
  noDuplicateNames,
  maxBlockDepth,
  validDuration,
  noUnusedAction,
];

export {
  noEmptyMonitor,
  noEmptyAlert,
  noEmptyAction,
  requireThreshold,
  requireInterval,
  requireAction,
  noDuplicateNames,
  maxBlockDepth,
  validDuration,
  noUnusedAction,
};
