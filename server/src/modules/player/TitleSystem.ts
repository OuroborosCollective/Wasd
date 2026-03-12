export class TitleSystem {
  assign(player: any, title: string) {
    if (!player.titles) player.titles = [];
    player.titles.push(title);
    return title;
  }
}