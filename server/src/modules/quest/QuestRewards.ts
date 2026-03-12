export class QuestRewards {
  grant(player:any, reward:any){
    if(!player.rewards) player.rewards = [];
    player.rewards.push(reward);
    return reward;
  }
}