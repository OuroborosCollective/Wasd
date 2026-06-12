import { Arg, Field, Float, InputType, Mutation, Resolver } from 'type-graphql';

@InputType()
export class Vector3 {
    @Field(() => Float)
    x!: number;

    @Field(() => Float)
    y!: number;

    @Field(() => Float)
    z!: number;
}

@Resolver()
export class ProfileResolver {
    @Mutation(() => Boolean)
    async dispatchBuilderNPCs(
        @Arg('location', () => Vector3) _location: Vector3,
        @Arg('profileId') _profileId: string
    ): Promise<boolean> {
        return true;
    }
}
