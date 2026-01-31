# mobile/src/presentation/components/infiniteFeed/types.ts

Tip ve tema turleri. Infinite feed bilesenlerinin ortak ThemeColors tipini saglar.

```ts
import { DARK_COLORS, LIGHT_COLORS } from '../../../core/constants';

export type ThemeColors = typeof DARK_COLORS | typeof LIGHT_COLORS;

```
