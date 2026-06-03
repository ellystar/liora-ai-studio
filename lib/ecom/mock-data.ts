export type Category = 'top' | 'bottom' | 'outerwear' | 'onepiece' | 'shoes' | 'accessory'
export const ratios = ['2:3', '3:4', '9:16', '4:3'] as const
export const qualities = ['1k', '2k'] as const
export type Ratio = (typeof ratios)[number]
export type Quality = (typeof qualities)[number]
