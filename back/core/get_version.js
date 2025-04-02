import dotenv from 'dotenv';
dotenv.config();

const getVersion = () => {
    return process.env.TAG_VERSION || '0.0.0.0';
}

export default getVersion