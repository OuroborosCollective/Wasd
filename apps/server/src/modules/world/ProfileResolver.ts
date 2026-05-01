import { Resolver, Query, Mutation, Arg, Ctx, FieldResolver, Root, Int, ID } from "type-graphql";
import { Profile } from "./ProfileEntity";
import { ProfileInput } from "./ProfileInput";

@Resolver(() => Profile)
export class ProfileResolver {
  @Query(() => Profile, { nullable: true })
  async profile(
    @Arg("id", () => ID) id: string
  ): Promise<Profile | null> {
    return Profile.findOne({ where: { id } });
  }

  @Query(() => [Profile])
  async profiles(): Promise<Profile[]> {
    return Profile.find();
  }

  @Mutation(() => Profile)
  async createProfile(
    @Arg("data", () => ProfileInput) data: ProfileInput
  ): Promise<Profile> {
    const profile = Profile.create(data);
    await profile.save();
    return profile;
  }

  @Mutation(() => Boolean)
  async deleteProfile(
    @Arg("id", () => ID) id: string
  ): Promise<boolean> {
    const result = await Profile.delete(id);
    return !!result.affected && result.affected > 0;
  }

  @FieldResolver(() => String)
  fullName(@Root() profile: Profile): string {
    return `${profile.firstName} ${profile.lastName}`;
  }
}