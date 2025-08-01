import mongoose from "mongoose";

/**
 * mongoose.set("strictQuery", false); sets Mongoose's query strictness to false.
 * This means that Mongoose will not return an error if you try to query for a
 * non-existent field. Instead, it will simply return an empty result.
 * With strict query set to true, Mongoose will return an error if you try to
 * query for a non-existent field.
*/

mongoose.set('strictQuery', false);

const connectToDB = async () => {
    try {
        const { connection } = await mongoose.connect(
            process.env.MONGO_URI || 'mongodb://localhost:27017/lms'
        );

        if (connection) {
            console.log(`Connection to MongoDB: ${connection.host}`);
        }
    } catch (e) {
        console.log(e);
        process.exit(1);
    }
}

export default connectToDB;