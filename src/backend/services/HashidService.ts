import dotenv from "dotenv";
import Hashids from "hashids/cjs";
dotenv.config();

class HashIdService {
    public users: Hashids;
}

const hashidService = new HashIdService();
hashidService.users = new Hashids(
    process.env.USER_HASHID_SALT,
    Number(process.env.USER_HASHID_MIN_LENGTH) || 8
);

export default hashidService;
