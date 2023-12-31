import dotenv from "dotenv";
import Hashids from "hashids/cjs";
dotenv.config();

class CustomHashids extends Hashids {
    public decodeSingle(hash: string | null): number | null {
        if (!hash) return null;

        try {
            const decoded = this.decode(hash);
            return Number(decoded[0]);
        } catch (e) {
            return null;
        }
    }
}
class HashIdService {
    public users: CustomHashids;
    public permissions: CustomHashids;
    public roles: CustomHashids;
}

const hashidService = new HashIdService();
hashidService.users = new CustomHashids(
    process.env.USER_HASHID_SALT,
    Number(process.env.USER_HASHID_MIN_LENGTH) || 8
);
hashidService.permissions = new CustomHashids(
    process.env.PERMISSION_HASHID_SALT,
    Number(process.env.PERMISSION_HASHID_MIN_LENGTH) || 8
);
hashidService.roles = new CustomHashids(
    process.env.ROLE_HASHID_SALT,
    Number(process.env.ROLE_HASHID_MIN_LENGTH) || 8
);

export default hashidService;
