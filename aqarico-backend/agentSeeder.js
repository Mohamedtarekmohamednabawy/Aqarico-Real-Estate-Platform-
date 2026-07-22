import dotenv from 'dotenv';
import mongoose from 'mongoose';
import User from './models/User.js';
import Agent from './models/Agent.js';
import Property from './models/Property.js';

dotenv.config();

const LOCAL_MONGO_URI = 'mongodb://127.0.0.1:27017/aqarico';

const connectDB = async () => {
    const envUri = process.env.MONGODB_URI;
    if (envUri && envUri.trim() !== '') {
        try {
            await mongoose.connect(envUri);
            console.log('✅ Connected to MongoDB');
            return;
        } catch (err) {
            console.warn('⚠️ Atlas connection failed, falling back to local...');
        }
    }
    await mongoose.connect(LOCAL_MONGO_URI);
    console.log('✅ Connected to Local MongoDB');
};

const AGENT_DATA = [
    {
        firstName: 'Ahmed',
        lastName: 'Mansour',
        email: 'ahmed.mansour@aqarico.com',
        phone: '+201012345678',
        bio: 'Expert in residential properties in New Cairo and Maadi.',
        avatar: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&q=80&w=800'
    },
    {
        firstName: 'Mohamed',
        lastName: 'Zaki',
        email: 'mohamed.zaki@aqarico.com',
        phone: '+201198765432',
        bio: 'Specializing in commercial real estate and investment opportunities.',
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=800'
    },
    {
        firstName: 'Mahmoud',
        lastName: 'El-Sayed',
        email: 'mahmoud.elsayed@aqarico.com',
        phone: '+201245678901',
        bio: 'Helping families find their dream homes in Alexandria.',
        avatar: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800'
    },
    {
        firstName: 'Ibrahim',
        lastName: 'Hassan',
        email: 'ibrahim.hassan@aqarico.com',
        phone: '+201555667788',
        bio: 'Luxury villa specialist with over 10 years of experience.',
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800'
    },
    {
        firstName: 'Ali',
        lastName: 'Abdel-Rahman',
        email: 'ali.ara@aqarico.com',
        phone: '+201000112233',
        bio: 'Dedicated agent focused on the North Coast property market.',
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800'
    },
    {
        firstName: 'Amr',
        lastName: 'Khaled',
        email: 'amr.khaled@aqarico.com',
        phone: '+201111223344',
        bio: 'Committed to finding the best rental deals for young professionals.',
        avatar: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800'
    },
];

const clearData = async () => {
    console.log('🗑️ Clearing existing agents and agent-users...');
    // Delete all agent avatars
    await Agent.deleteMany({});
    // Delete all users who have the 'agent' role
    await User.deleteMany({ role: 'agent' });
    console.log('🧹 Cleanup finished.');
};

const seedAgents = async () => {
    try {
        await connectDB();

        // Check for --clear flag
        if (process.argv.includes('--clear')) {
            await clearData();
        }

        console.log('🚀 Starting Agent Seeding...');

        const allProperties = await Property.find({ status: 'available' }).limit(100);
        if (allProperties.length < AGENT_DATA.length * 5) {
            console.error('❌ Not enough properties. Run property seeder first.');
            process.exit(1);
        }

        let propIndex = 0;

        for (const data of AGENT_DATA) {
            // 1. Create or Find User
            let user = await User.findOne({ email: data.email });
            if (!user) {
                const username = data.email.split('@')[0];
                user = await User.create({
                    firstName: data.firstName,
                    lastName: data.lastName,
                    username: username,
                    email: data.email,
                    password: 'AgentPassword2024!',
                    role: 'agent',
                    country: 'EG',
                    avatar: data.avatar,
                    isVerified: true
                });
                console.log(`👤 User created: ${data.firstName}`);
            }

            // 2. Create or Find Agent avatar
            let agent = await Agent.findOne({ user: user._id });
            if (!agent) {
                agent = await Agent.create({
                    user: user._id,
                    name: `${data.firstName} ${data.lastName}`,
                    bio: data.bio,
                    phone: data.phone,
                    avatar: data.avatar,
                    isVerifiedByAdmin: true,
                    assignedListings: []
                });
                console.log(`👔 Agent Avatar created for ${data.firstName}`);
            }

            // 3. Assign 5 properties
            const assignedProps = [];
            for (let i = 0; i < 5; i++) {
                const prop = allProperties[propIndex++];
                if (prop) {
                    prop.owner = user._id;
                    prop.agent = agent._id;
                    await prop.save();
                    assignedProps.push(prop._id);
                }
            }

            agent.assignedListings = assignedProps;
            await agent.save();
            console.log(`✅ Assigned ${assignedProps.length} properties to ${data.firstName}`);
        }

        console.log('🎉 Agent Seeding Completed Successfully!');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    }
};

seedAgents();