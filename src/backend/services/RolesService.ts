import { AppDataSource } from "backend/database/data-source";
import { User } from "backend/database/entity";


export async function userTopPower(userId: number): Promise<number> {
    const topPower = await AppDataSource.getRepository(User)
        .createQueryBuilder("user")
        .select("MAX(role.power)", "topPower")
        .innerJoin("user.roles", "role")
        .where("user.id = :userId", { userId: userId     })
        .getRawOne();

    const maxPower = topPower.topPower;

    return maxPower;
}
