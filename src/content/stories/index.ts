/** Phase 6 stories for the recipe levels (11–130), one file per module. */

import type { LevelStory } from '../story';
import { MODULE_2_STORIES } from './module2';
import { MODULE_3_STORIES } from './module3';
import { MODULE_4_STORIES } from './module4';
import { MODULE_5_STORIES } from './module5';
import { MODULE_6_STORIES } from './module6';
import { MODULE_7_STORIES } from './module7';
import { MODULE_8_STORIES } from './module8';
import { MODULE_9_STORIES } from './module9';
import { MODULE_10_STORIES } from './module10';
import { MODULE_11_STORIES } from './module11';
import { MODULE_12_STORIES } from './module12';
import { MODULE_13_STORIES } from './module13';

export const STORIES: Record<number, LevelStory> = {
  ...MODULE_2_STORIES,
  ...MODULE_3_STORIES,
  ...MODULE_4_STORIES,
  ...MODULE_5_STORIES,
  ...MODULE_6_STORIES,
  ...MODULE_7_STORIES,
  ...MODULE_8_STORIES,
  ...MODULE_9_STORIES,
  ...MODULE_10_STORIES,
  ...MODULE_11_STORIES,
  ...MODULE_12_STORIES,
  ...MODULE_13_STORIES,
};
