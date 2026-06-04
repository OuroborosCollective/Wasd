#!/usr/bin/env node
/**
 * download-all-stitch-assets.mjs
 * 
 * Downloads ALL assets from the Stitch project with proper naming.
 * Downloads character sprites, biome tiles, icons, and props.
 */

import { existsSync, mkdirSync, writeFileSync, readFileSync, statSync } from 'node:fs';
import { join, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'child_process';

const STITCH_API_KEY = process.env.STITCH_API_KEY || '';
const STITCH_PROJECT_ID = '3680791926463184978';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const root = scriptDir.replace('/scripts', '');
const publicRoot = join(root, 'apps/client-2d/public/2d-assets');
const gameAssetsRoot = join(publicRoot, 'game-assets');

function log(msg, type = 'info') {
  const icons = { info: '📦', success: '✅', error: '❌', warn: '⚠️' };
  console.log(`[StitchDL] ${icons[type] || '📦'} ${msg}`);
}

function download(url, path) {
  try {
    execSync(`curl -L --fail --retry 3 -o "${path}" "${url}"`, { stdio: 'pipe' });
    return true;
  } catch (e) {
    log(`Failed: ${url}`, 'error');
    return false;
  }
}

function slug(str) {
  return String(str || 'asset')
    .normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '')
    .slice(0, 50);
}

// Character class mapping
const CHARACTER_CLASSES = {
  'A professional sprite atlas sheet for a 2D top-down fantasy Archer': 'archer',
  'A professional sprite atlas sheet for a 2D top-down fantasy Bard': 'bard',
  'A professional sprite atlas sheet for a 2D top-down fantasy Berserker': 'berserker',
  'A professional sprite atlas sheet for a 2D top-down fantasy Cleric': 'cleric',
  'A professional sprite atlas sheet for a 2D top-down fantasy Necromancer': 'necromancer',
  'A professional sprite atlas sheet for a 2D top-down fantasy Paladin': 'paladin',
  'A professional sprite atlas sheet for a 2D top-down fantasy Ranger': 'ranger',
  'A professional sprite atlas sheet for a 2D top-down fantasy Rogue': 'rogue',
  'A professional sprite atlas sheet for a 2D top-down fantasy Mage': 'mage',
  'A professional sprite atlas sheet for a 2D top-down fantasy RPG character (Warrior)': 'warrior',
  'A professional sprite atlas sheet for a 2D top-dow fantasy RPG character (Mage)': 'mage',
};

// Asset type detection
function detectType(title) {
  if (/archer|bard|berserker|cleric|mage|necromancer|paladin|ranger|rogue|warrior/i.test(title)) return 'models';
  if (/forest|city|tile|world|biome/i.test(title)) return 'biomes';
  if (/alchemy|crafting|inventory|consumables|skills|spells|icon/i.test(title)) return 'symbols';
  if (/resource|farming|harvest|ore|crystal/i.test(title)) return 'resources';
  if (/trade|props|routes|barrel|crate/i.test(title)) return 'props';
  return 'other';
}

// Direct mapping of all screens with screenshots
const ASSET_MAP = [
  // Character sprites
  { title: 'A professional sprite atlas sheet for a 2D top-down fantasy Berserker', suffix: 'berserker_sprite', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy Archer', suffix: 'archer_sprite', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy Bard', suffix: 'bard_sprite', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy Cleric', suffix: 'cleric_sprite', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy Necromancer', suffix: 'necromancer_sprite', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy Paladin', suffix: 'paladin_sprite', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy Ranger', suffix: 'ranger_sprite', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy Rogue', suffix: 'rogue_sprite', type: 'models' },
  { title: 'An expanded professional sprite atlas sheet for a 2D top-dow fantasy Mage', suffix: 'mage_expanded', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy RPG character (Mage)', suffix: 'mage_rpg', type: 'models' },
  { title: 'A professional sprite atlas sheet for a 2D top-dow fantasy RPG character (Warrior)', suffix: 'warrior_rpg', type: 'models' },
  
  // Biome tiles
  { title: 'A high-fidelity tile atlas sheet for a 2D top-down fantasy Trade Routes & Props', suffix: 'trade_routes', type: 'biomes' },
  { title: 'A high-fidelity tile atlas sheet for a 2D top-dow fantasy Forest & City', suffix: 'forest_city', type: 'biomes' },
  { title: 'A high-fidelity tile atlas sheet for a 2D top-dow fantasy Ice World', suffix: 'ice_world', type: 'biomes' },
  { title: 'A high-fidelity tile atlas sheet for a 2D top-dow fantasy Sand World', suffix: 'sand_world', type: 'biomes' },
  { title: 'A high-fidelity tile atlas sheet for a 2D top-dow fantasy Swamp World', suffix: 'swamp_world', type: 'biomes' },
  { title: 'A high-fidelity tile atlas sheet for 2D top-dow fantasy interior environments', suffix: 'interior', type: 'biomes' },
  { title: 'A high-fidelity tile atlas sheet for a 2D top-dow fantasy Resource Farming', suffix: 'resource_farming', type: 'biomes' },
  
  // Icons
  { title: 'A high-fidelity icon atlas sheet for 2D MMORPG Skills & Spells', suffix: 'skills_spells', type: 'symbols' },
  { title: 'A high-fidelity icon atlas sheet for 2D MMORPG Alchemy & Crafting', suffix: 'alchemy_crafting', type: 'symbols' },
  { title: 'A high-fidelity icon atlas sheet for 2D MMORPG Inventory Consumables', suffix: 'inventory', type: 'symbols' },
  
  // Preview/animation
  { title: 'Berserker Animation High-Fidelity Preview', suffix: 'berserker_preview', type: 'models' },
];

// Screens with URLs from Stitch API
const SCREENS = [
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLst-rlFaN2KBcgE_SJnYWGjIvTfBY0QeJyHp73yy7wiU4_MJuGzHJUPgx5-z8IyK4_6HqkaUasghV2rMtDCF_fvVMFBt3PRJ6u6-l7OFb9nzKd795xP3Y7wlsJVFMRAscsVxZkoNJvsOutvUchjR-fXeFBCsXpTGeSWjjoXUMml--EGpd9F83VBIxniPkvcTZYrDX--2fVajy-Nk9Fah-7pzqB6XsemW8wJKqQDB1hrzRhiLcTpySNfqg', title: 'Berserker' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLubX5gKQgEKbYDMZEiOgx2btHSnsz8PoOdDct5nPHsiMsA6X-8gEXtPShiwinPbiFpuSXAUd9LG_a3YK_gYGkgPSwVtXUJzx8ohNloejsa692emhvdejF0LYAdfHF8HcCM1BMGuHMKnloOYJfwqoskI4M-OBZ14yp3bYsyCdVkHI5L9CFVpgjoEJFmJUtZxvffwkIvbZEDgg0BAMbxw8Y-dGUezvocPgFKXr57TWDSZsHzn6icUY1vx9iY', title: 'Trade Routes' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLvphEVAJh_3iKam0IMgxhTFR8028YK9X34AjTBchV5Xcg3sekg1bsvEL4HCKKPqAHHLcZ5a3t74F3jiyqV1IF81tg0QeguZGhIcT74vgX5dsFcrTrOS0QRFTfcwyKdacwRtkWRZ7pWE2D3S7eGcDOmItUPLuNOel5G17vb3NaxwFFCn0m5mT6Us3ug71MIY7v7RmtBPQ8SOQzfiWbgsbfxmrQP6psKDjlGVb4vAc6LoLGdV2UW54D7juw', title: 'Skills & Spells' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLs_wvYgi76wBDIwfYO_NxhenCHHHCaELM_Ba1NFhePtzz-ib1hIq8VN3MRwWrOwBFOp-2SIDlq0IDAydFQOe7yN2v7c5b77cloFNqBgoTVVaZFtLigGUPUsYla-7aZ4k8nJo2NxoM081Rx9Q5jTdA7uwj1wIgGgfHgyM0Obwc0srWpkXrsVd1oN9o4GfIW1nM9wIkDvC9m8WloySVwXl_8fwlFQAywkdxFSzoOKz5cV7ftsfTLqh3rpQm4', title: 'Archer' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLvSI44GMitswfE7AWJRFviqSuNpDmmgQHOSbvo1sW62mFGUglPe32FNJU7vesyjRRJOcrFO3NQwRIhQKpl4cRHCEweRF5gXeW94CYR-D1moy4RuVz7y9glY4H_AjDZ4V0mH-qsh9qPu73FP1YNHbKbI_zkhCQKpc_svJm016QbRyL0Wl6Cij_HD7Fp4ZSDvQBOpq_kWvbvROlFME_XOQH3X23RObKHUxCsUahq79TLZwHJ5bLgg-hl3wr4', title: 'Resource Farming' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLuHck5IjRI_pII5VMOozGsIU6gdswQwtDZ2byVWFXGug_oRoC850J279sRSD8d1Gp5E7_X30ASXrBUGhkyGLuChPS2AQ6tS09rTWWpPQgXSTQCbWUwteXWi5yPraC03HylWrjthZXfWxEkK4klxQwnMHfOylApmuQyDPqGBDAq2FjUuto0psQoBt2Q9lr_xLI7mq_TB04rbWNd0_2uiHbX1v2kXPTJVJ5tn8ul6Ia6Dxq_oh_wWRlYHwQ', title: 'Bard' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLsjERiiye_PXLSA34hz8dXp9UOUCt-a3py0LqP-R_URxpMNN1nb1W3T5PchkWY5WnQmLxlP06IGA7j1L-ctf8kA24zCzB90rsLz_vd6ZxKncM5ZcewloVqU2wAuOipHj-ILgb9PqKpdVStneyOSGgH31l_xkxq99ssRftq1gS8TcCNBVzVKkemerlmjax3q15JGIBfo0moIDgD56mykK_HbD5T8QC-UzvYwH2t8O2Su2qXCDfAfOvoTvUM', title: 'Ranger' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLtS3pL5juqZzxNzlRTpkXrF0j4G-Lym7oRI7GdjWaeUIHWYTQUaA1VRWiJhFobEBlmgY2xoKOTlNiUj13LScsaPYed-3V8IglpiZNm6h1NstQ2HvolkHQVltw30Pf6ZZWMHJtD2lJpqdJHwlBVIR5xqGEYBgESc1uWlO89Nnf7z3dQtDF-X8wuOnaxdpRjSA-U6iBH_4QbMUmAPlXQNMwQ4zNqZBm_2BS4m1ckmft_SA9YPOYfvMbkNPg', title: 'Sand World' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLs3f-YnqLYR55sNYDaMWGErL5pjEHBrdOBiX0r1F_E9G47tIzvvqYttsnOFzhQOzbAwzvBvTgIIDsqB55Lz4LRg3DtI35o8xVCadbDSn9SARPfdE8CkwzPDcTnkOJ7dDIDBsJWxam6HNhkWCLvXCrfOzPwphRQ6t6n2h7RK-l-7cnlWE8FpEc7Z02KFnpwKTF4qQYGZ86P1TUtrDx7NxaGwzLJpKf3r0YlnrbAzSvLDhG0MQcm8k3lLKAE', title: 'Rogue' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLvFnTth3s7W2CbmxjQiSXmkEkW0pzbZpz7l9DDq4hS3vhHDc82eKYdQcCiiBja2_Ikr-iIh1QIugb22-eDyC9izBSGdiZmzKXapBNcyw2yy7jvueik6yPEttmDmYaGcJYBWhqv5Plb48bixIROJWu9Q9se5KjPB9bVZQYzA2lkJ9JBBAHPOuphe5B_2cJ8KrBDuhyqfc7a6fxrwT0tyN-36WUTU3-T2J8GQYtsKgp4Qv-yqvB8R9iUWzNY', title: 'Interior' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLut5Dt7DjHB8AMhhe9Q3pEulkBBmjP5rXtci6CUA8XmhY2LX5zyTxmNwTZvojD1IxN5ef8PwKPh85O2PGxC14pfyYYLqitlpWrruPsuTX_XFZk8UgaHFtCT77r7n5DOciXyZkLG25a6qtD4Q9wQxbTyDiA7_dXCLLxyw61AY7rc4HGHRSJCk05_sR1E7qa8a6on4ZDjejihqvcfs30orRR0DSEn7kpYTta6ZVCXLaskoYJppWlknPoWQ', title: 'Paladin' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLsNVHt8bUpFLj2qJGQC2aGuNHZ7sZeUSFmJ0FNyjZq2adv2T1tpFICbNPtdkWPqN1ME4lHL1YmBm9pjA9RBVQEqdIA2Z6r5Fff-qCEmldvgct4-pqKVVKWWqGHO3Xx8o4p5Bqx6Dpx7NbKfLNBNOWlf9DfSvp7AgVhnK0tBBuEaKfG7lp4Odu5VGznG6kAehfGNfM7jbFTlhMG5V84kLKKlOkODmxQ99eo0Nz-aGkBc7SuuQRlvx4I1ABw', title: 'Alchemy & Crafting' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLu9RAdoF65DYmjkKVPKbHMMQmNoOmfDw4OYCHjfrGMoyflyi5uWm7ozFTBYklNw66wKfYnYdMzKB195nWI9Kb5-sWqFDJEXtu2RxLBrmpOfbNE21XtX7Jye2FPJn-DvHl1uE_JuRoK_sF6QEuvAtMsgggo3zuKsG9aCBkxe9ZCB5w01J6ESAqbEXSt1Gjip0HC5cTSGT3dW_DbQJGA8bdFA7D3Zn9WZUhFYnFqML6O15Pqwg47uMLoX5tI', title: 'Inventory Consumables' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLvhLEIkpb8jZnQO0VQiWBbxJu7DpOh83LFWjIT2QgKr9X_WLJkQzigVb_YekYr3bOxqQ1-QQtOqAqKqxAXP3qb9xrDZkHa470kQV2IHEZ2Acr_betJHRs7W-ey8AG9UoDYyRPuDzb748TkJy_Vc4Oe_WIkGYHj0RHny50IuBnISSslEQZP2L49y6AjKI4ElVX_jwil3J3FTtN7FXZeFtsIQNu3TF_dSoY09-dFHXPhvdiT9RgUARTNZTLY', title: 'Cleric' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLum00Wce8QAHJnAjKN0WTOvzekhmMBzpAy4fFUQydCVsspIdjKG5mj6xWcOlsWEkvBqp95AvAr0zdb6yfMJSN46AJRx68MCqzHnC-5UCE6gsITBstJNwgELjQ4ZteSnXyFCeeEr6v7R_1E-IkGTNm6tfAU9mxhTQmv79ZG0qRNAwklVr0QXzBVs2jcVNRY5zVmf3_W13CgBGkRdfiAtoF45pqyNQ5DBfAo0rwMfdBWSIqPehC7q5lr-Eg', title: 'Mage Expanded' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLucCTrwKbHhiA1myeVm11za2eMVEskOi6-WXKhDIwzbriRVSSj9e2H3U1GE1qMoTnfeibYSL4EeKyUGFhSzlPHKWZMMxdF2xlzB1W5cpc2QANpfj1CnG56VbUKJFrZU3MZpbDba8lfGhVzHUtMk6D7w4IlHJEw_H78z3B8fv1kslcEjXOt4VTgaf84y8amHXhNo15ov7dNMZ1w3G74Dto0oWyU1mWKd8g3Re36rHXYIW5zXjAaL4uqSXw4', title: 'Warrior RPG' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLvOczRDow5AUYlx6tSwoH9_pHwpPpO8T6WmmCuWnZpYCeR_8Y39twWKdYxzhBw3coQ5XKjp1-NC7ZE-1H815TYXGoY-YxS8xyES5eh0Mgx4SGISmYBxxwyFNNwqMdt0drTdmO_acn_BuOUdc8GYTmmMCfdPYv-p5PRWPyNRbbd3XiGdSVZGnZ1pSTl2zIA_-kBUYETtHPj7Qt1epdXg8JWfZZejjKyF4Pe5oX5rWKbnNHs_JYlkfRz8Xi4', title: 'Ice World' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLtyz3prBti16CVDs7kkJLvTIOaeoRoh8kBlQsCLizyDCNFnSwm7eZMwtLKNX3AgpjiUrLuF9RKe8MS0BKHpj29wfkJPqXu2xq68EPZ9wmnynkgKbd3faulcCwdybTE0A58xJd2HzNiL7TJzEu49wA-fuyg_Zko6ZVfMs9Oc3lbEoQKHo_nN1LdcNFmeeGNxx089cPZfkshYLhzGRxSiowZgq8UG5cXiHPd-YGZmRqWOly1VbvH8U3-MFYc', title: 'Paladin Alt' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLt0o3c2BBrnLSp7YB5ohZbSK3qQ02lBZGDWMupy2qsxySv0p_hnizBnoYSML0ExujbKde8NGxNle72PHjzaKPxpFs8CjYQiI-_Y4hW6yAASC7THPFYKlDbMGXPitSozad82qqjcWLi1TUB8KRxauM3O9KBL0GwMev45Pvh6Q0sWY7CFyJZJu2WhJEgsx7OmFToZsXaHbT4xZDn3W9wuW2mwRZHqnVTjElLeqCBfEBdgdGPOd3vqcBNs-w', title: 'Archer Alt' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLvfbXpqANWpFXeO2LpBxdXRJChemtZ12LTFow1_5IR2N8k9_CyKgS4TyV2U-cXRLsEt3CY3kPVI1CvyPDC1ARxAkhMB9zSijOJqZJFYqm_EDja3Z7E4AMMNv_zf3rOkibu6_dj2-hKuOLrb-7iDn9EB68YOWPZ7cFVRD4x3F70Cx1kQIrx3cWW-MrnelFjAEL7g2o1fOs1FKvDHAPO8ZHOg3qGEQHagaynITqoSK6qTtFU79c6d1Q7Y-A', title: 'Cleric Alt' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLuYqt8BOD3EjsoWpvsZ6xR2LVww8jmY8cIp22dBXgdX1ZvDLMeZuURaJ-wz6ePk70ez59Lms96yLwzxVAxFBSwc4wnXMA-nzPyyHsYOJwp_quETIbuBWWnVLDdMM-fpNcOOIdMrQKOmV9NGii-85HIGY-7XOk0qcBb7ROKZWp1CdKcYqXeAPy9w9PNFj0wTTKCEHJ4UJDuZMSd00FVSbb76kDftjIVnSSEQqzFPjS5zbFeWHeO9_K-Qkw', title: 'Necromancer' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLuaNmA35SGZ16mbnPMMHK4thRzq2s_Yjt9k-OLpJpqUcLoSihN17HPqq7uzq5783O9_rO8_PsWx-I374Jx8FQhxqSaG85oKszRbGp40P3gdFJkuzwSdjcK8UpYOUXuHl1sNxQvVvcaz0dNNRWTCdDwmnJ8zkilcpNdrI41RQheGrZN-SbqXejACIv0u6Q9a0kZzhlTNJ7Zh1khi9lNHTCL2xfXxQreG9eRSp3j9vQezJwNkqNnyYco51So', title: 'Berserker Preview' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLtTY4vC5VT_FH9fLEK41OBE9uJiJiqNbrN1JOZyjkvJIk1vUBoXzFn08NK1TWHaWjQPTvj6JaooqJSfpDZ1OsQOMPn8tyz1yhZ2RuQPYVJgfFDpIDgv-IcxuVg7BUxmZ8uwT2lSJ_VJ3GSTuodVN6CNjVOOM37PCPhskDfb9gs2qXiAno9U6O7ostEBdmhFQuAL1WSE10t7UhlA7nFSUY4xCFvx4VQjkIK0IWczim4xl7VqVcUE_CXXnoQ', title: 'Swamp World' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLvhMKEq3-xNP4Oft_0gGU4PH1omtFmMMi79NXyeRWZOHsWPLdrDCACBQyAFbggbwGQGWctmTn7ewAeSyDscjthhf3IjWbXvgXwR_SaAzrSerMmFkdGiWputEJ2pxdDSeiQ4KSL9mRVtMTdhhVa6qJI7_uiPuTVN3uA0_J5ZblhZNDmCbDsmrmTUuzGT8lxyFkzLv6yvylB7tvPVDeEiODdus2ORF5BkDYPKu5yusfS6i1MYs9H5s6723pY', title: 'Mage RPG' },
  { url: 'https://lh3.googleusercontent.com/aida/AP1WRLtM2QDMY0QWL5t4wCeJCyPUeRQr21x71ywZHJX_DWJQOxOKdw5ru3IZpowr7T8eGx7BeDszKEHTaW5Zh6JslDTGPWsBdpbcsA-oYqKWZE2eQhTHeEbOBENLDms-HTTzhcGfu-CxcA8e6UiAzkUKD0KhGvW6HQbycnmCMqD_f4q4XgyAqaGDm7NlLOW08DjDFCMJez9-FnIoGCBJbabENIxdDEcIJNDh0wkUa7l2gj4-UhuGXTHt0kpke9g', title: 'Forest & City' },
];

// Target directories
const DIRS = {
  models: join(gameAssetsRoot, 'models', 'characters'),
  biomes: join(gameAssetsRoot, 'biomes'),
  symbols: join(gameAssetsRoot, 'symbols'),
  resources: join(gameAssetsRoot, 'biomes', 'resources'),
  props: join(gameAssetsRoot, 'biomes', 'props'),
};

// Ensure directories exist
Object.values(DIRS).forEach(d => mkdirSync(d, { recursive: true }));

// Type mapping
const TYPE_MAP = {
  'Berserker': 'models', 'Archer': 'models', 'Bard': 'models', 'Cleric': 'models',
  'Necromancer': 'models', 'Paladin': 'models', 'Ranger': 'models', 'Rogue': 'models',
  'Mage': 'models', 'Mage Expanded': 'models', 'Mage RPG': 'models', 'Warrior RPG': 'models',
  'Archer Alt': 'models', 'Cleric Alt': 'models', 'Paladin Alt': 'models',
  'Berserker Preview': 'models',
  'Trade Routes': 'props',
  'Skills & Spells': 'symbols', 'Alchemy & Crafting': 'symbols', 'Inventory Consumables': 'symbols',
  'Resource Farming': 'resources',
  'Forest & City': 'biomes', 'Ice World': 'biomes', 'Sand World': 'biomes',
  'Swamp World': 'biomes', 'Interior': 'biomes',
};

let downloaded = 0;
const results = [];

for (const screen of SCREENS) {
  const type = TYPE_MAP[screen.title] || 'other';
  const targetDir = DIRS[type] || DIRS.models;
  const fileName = `stitch_${slug(screen.title).toLowerCase()}.png`;
  const filePath = join(targetDir, fileName);
  
  log(`Downloading [${type}]: ${screen.title}`);
  
  if (download(screen.url, filePath)) {
    const stat = statSync(filePath);
    log(`  ✓ ${fileName} (${(stat.size / 1024).toFixed(1)}KB)`, 'success');
    downloaded++;
    results.push({ title: screen.title, type, path: filePath, size: stat.size });
  }
}

log('');
log('════════════════════════════════════════════════');
log(`DOWNLOAD COMPLETE: ${downloaded}/${SCREENS.length} assets`);
log('════════════════════════════════════════════════');
log('');

// Create JSON atlases for downloaded assets
for (const result of results) {
  const baseName = result.path.replace('.png', '');
  const frameSize = result.type === 'models' ? 256 : 64;
  const gridSize = result.type === 'models' ? 4 : 8;
  
  // Generate frame data
  const frames = {};
  const animations = result.type === 'models' 
    ? ['idle', 'walk', 'fight', 'die'] 
    : ['tiles'];
  
  if (result.type === 'models') {
    // Character sprite: 8 directions x 4 animations x 5 frames
    const directions = ['n', 'nw', 'w', 'sw', 's', 'se', 'e', 'ne'];
    for (let animIdx = 0; animIdx < 4; animIdx++) {
      for (let dirIdx = 0; dirIdx < 8; dirIdx++) {
        for (let frame = 0; frame < 5; frame++) {
          const x = dirIdx * frameSize;
          const y = (animIdx * 5 + frame) * frameSize;
          const frameName = `${slug(result.title)}_${animations[animIdx]}_${frame}.png`;
          frames[frameName] = { x, y, w: frameSize, h: frameSize };
        }
      }
    }
  } else {
    // Tile/icon: 8x8 grid
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        const x = col * frameSize;
        const y = row * frameSize;
        const frameName = `tile_${row}_${col}.png`;
        frames[frameName] = { x, y, w: frameSize, h: frameSize };
      }
    }
  }
  
  const atlas = {
    frames,
    animations: result.type === 'models' 
      ? { idle: [], walk: [], fight: [], die: [] }
      : { tiles: [] },
    meta: {
      app: 'Areloria WASD - Cozy Asset Director',
      version: '1.0.0',
      image: basename(result.path),
      format: 'RGBA8888',
      size: { w: frameSize * 8, h: frameSize * (result.type === 'models' ? 20 : 8) },
      scale: '1',
      stitchProject: STITCH_PROJECT_ID,
      category: result.type,
    },
  };
  
  // Fill animations
  if (result.type === 'models') {
    for (let f = 0; f < 5; f++) {
      atlas.animations.idle.push(`${slug(result.title)}_idle_${f}.png`);
      atlas.animations.walk.push(`${slug(result.title)}_walk_${f}.png`);
      atlas.animations.fight.push(`${slug(result.title)}_fight_${f}.png`);
      atlas.animations.die.push(`${slug(result.title)}_die_${f}.png`);
    }
  } else {
    for (let row = 0; row < 8; row++) {
      for (let col = 0; col < 8; col++) {
        atlas.animations.tiles.push(`tile_${row}_${col}.png`);
      }
    }
  }
  
  writeFileSync(`${baseName}.json`, JSON.stringify(atlas, null, 2) + '\n');
  log(`  Created atlas: ${basename(result.path.replace('.png', '.json'))}`, 'success');
}

// Update manifest
const manifestPath = join(gameAssetsRoot, 'manifest.json');
let manifest = { assets: {} };
if (existsSync(manifestPath)) {
  try { manifest = JSON.parse(readFileSync(manifestPath, 'utf8')); } catch (e) {}
}

manifest.assets.models ??= {};
manifest.assets.biomes ??= {};
manifest.assets.symbols ??= {};
manifest.assets.shirts ??= {};
manifest.version = manifest.version || 1;
manifest.lastFullImport = new Date().toISOString();

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
log('');
log(`Manifest updated: ${manifestPath}`);
log('');
log('All assets ready for VPS deployment!');