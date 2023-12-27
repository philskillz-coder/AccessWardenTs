import dotenv from "dotenv";
import Hashids from "hashids/cjs";
dotenv.config();

class HashIdService {
    public users: Hashids;
    public permissions: Hashids;
    public roles: Hashids;
}

const hashidService = new HashIdService();
hashidService.users = new Hashids(
    process.env.USER_HASHID_SALT,
    Number(process.env.USER_HASHID_MIN_LENGTH) || 8
);
hashidService.permissions = new Hashids(
    process.env.PERMISSION_HASHID_SALT,
    Number(process.env.PERMISSION_HASHID_MIN_LENGTH) || 8
);
hashidService.roles = new Hashids(
    process.env.ROLE_HASHID_SALT,
    Number(process.env.ROLE_HASHID_MIN_LENGTH) || 8
);

export default hashidService;
