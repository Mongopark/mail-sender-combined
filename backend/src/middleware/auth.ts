import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import bcrypt from 'bcrypt';
import { db } from '../models/db';
import { users } from '../models/schema';
import { eq } from 'drizzle-orm';

export const localStrategy = new LocalStrategy(async (username, password, done) => {
  try {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    if (!user) {
      return done(null, false, { message: 'Incorrect username.' });
    }
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return done(null, false, { message: 'Incorrect password.' });
    }
    return done(null, user);
  } catch (err) {
    return done(err);
  }
});

export const getJwtStrategy = () => {
  const jwtOptions = {
    jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
    secretOrKey: process.env.JWT_SECRET!,
  };
  return new JwtStrategy(jwtOptions, async (payload, done) => {
    try {
      const [user] = await db.select().from(users).where(eq(users.id, payload.id));
      if (user) {
        return done(null, user);
      } else {
        return done(null, false);
      }
    } catch (err) {
      return done(err, false);
    }
  });
};

// passport.use(jwtStrategy); // Move to index.ts