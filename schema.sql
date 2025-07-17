-- Database Schema for Northern Attitude

-- Create database if it doesn't exist
CREATE DATABASE IF NOT EXISTS northern_attitude;

-- Use the database
USE northern_attitude;

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(50),
  last_name VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS teams (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE, -- e.g., "Toronto Maple Leafs"
  description TEXT,
  city VARCHAR(100), -- e.g., "Toronto"
  mascot VARCHAR(100), -- e.g., "Carlton the Bear"
  logo_url VARCHAR(255), -- URL for the team's logo image
  primary_color VARCHAR(7), -- Primary team color (hex code) e.g., "#0066CC"
  secondary_color VARCHAR(7), -- Secondary team color (hex code) e.g., "#FFFFFF"
  accent_color VARCHAR(7), -- Accent team color (hex code) e.g., "#969696"
  created_by INT UNSIGNED NOT NULL, -- Links to the user who created the team
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS characters (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  nickname VARCHAR(100) NULL,
  age INT UNSIGNED NULL,
  birthday DATE NULL,
  zodiac VARCHAR(50) NULL,
  hometown VARCHAR(100) NULL,
  education VARCHAR(100) NULL,
  occupation VARCHAR(100) NULL,
  sexuality VARCHAR(50) NULL,
  pronouns VARCHAR(50) NULL,
  languages VARCHAR(100) NULL,
  religion VARCHAR(50) NULL,
  gender VARCHAR(50) NULL,
  url VARCHAR(255) NULL, -- URL for the player's image
  role ENUM('Player', 'Staff', 'Civilian') NOT NULL,
  position VARCHAR(50) NULL,
  jersey_number INT UNSIGNED NULL,
  team_id INT UNSIGNED NULL, -- Reference by team ID instead of name
  job VARCHAR(100) NULL,
  bio TEXT NULL,
  faceclaim VARCHAR(255) NULL,
  avatar_url VARCHAR(255) NULL,
  banner_url VARCHAR(255) NULL, -- URL for the character's banner image
  sidebar_url VARCHAR(255) NULL, -- URL for the character's sidebar image
  spotify_embed TEXT NULL, -- Spotify playlist embed code
  quote TEXT NULL, -- A quote displayed on the character's profile
  personality TEXT NULL,
  strengths TEXT NULL,
  weaknesses TEXT NULL,
  likes TEXT NULL,
  dislikes TEXT NULL,
  fears TEXT NULL,
  goals TEXT NULL,
  appearance TEXT NULL,
  background TEXT NULL,
  skills TEXT NULL,
  favFood VARCHAR(100) NULL,
  favMusic VARCHAR(100) NULL,
  favMovies VARCHAR(100) NULL,
  favColor VARCHAR(50) NULL,
  favSports VARCHAR(100) NULL,
  inspiration TEXT NULL,
  full_bio TEXT NULL,
  is_private BOOLEAN NOT NULL DEFAULT FALSE,
  gallery TEXT DEFAULT NULL,
  created_by INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
  INDEX idx_created_by (created_by),
  INDEX idx_team_id (team_id)
);

CREATE TABLE IF NOT EXISTS posts (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL, -- Title of the post or scene
  content TEXT NOT NULL, -- The actual roleplay content
  post_type ENUM('text', 'image', 'video', 'poll', 'event', 'scene', 'story') NOT NULL DEFAULT 'text',
  author_id INT UNSIGNED NOT NULL, -- Links to the user who wrote the post
  character_id INT UNSIGNED, -- Optional: Links to the character featured in the post
  privacy ENUM('public', 'followers', 'private') NOT NULL DEFAULT 'public',
  view_count INT DEFAULT 0,
  event_date DATE NULL, -- Date of the event
  event_time TIME NULL, -- Time of the event
  event_location VARCHAR(255) NULL, -- Location of the event
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS post_likes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED, -- Optional: Like can come from a character
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
  UNIQUE KEY (post_id, user_id, character_id) -- Prevent duplicate likes
);

CREATE TABLE IF NOT EXISTS comments (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED, -- Optional: Comment can come from a character
  content TEXT NOT NULL,
  parent_id INT UNSIGNED, -- For threaded comments, reference to parent comment
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
  FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS relationships (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  character1_id INT UNSIGNED NOT NULL, -- Links to the first character
  character2_id INT UNSIGNED NOT NULL, -- Links to the second character
  relationship_type VARCHAR(50), -- e.g., "Friend", "Rival", "Teammate"
  description TEXT, -- Optional: A description of the relationship
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (character1_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (character2_id) REFERENCES characters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS tags (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE -- e.g., "Hockey", "Drama", "Romance"
);

CREATE TABLE IF NOT EXISTS post_tags (
  post_id INT NOT NULL,
  tag_id INT NOT NULL,
  PRIMARY KEY (post_id, tag_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS media (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  url VARCHAR(255) NOT NULL, -- URL to the media file
  type ENUM('image', 'video', 'audio') NOT NULL, -- Type of media
  post_id INT UNSIGNED, -- Optional: Links to a post
  character_id INT UNSIGNED, -- Optional: Links to a character
  uploaded_by INT UNSIGNED NOT NULL, -- Links to the user who uploaded the media
  uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  FOREIGN KEY (uploaded_by) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS post_media (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  media_id INT UNSIGNED NOT NULL,
  display_order INT DEFAULT 0, -- For ordering multiple media in a post
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS follows (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  follower_id INT UNSIGNED NOT NULL, -- User doing the following
  following_id INT UNSIGNED, -- User being followed (NULL if following a character)
  character_id INT UNSIGNED, -- Character being followed (NULL if following a user)
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (follower_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (following_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE,
  UNIQUE KEY (follower_id, following_id, character_id) -- Prevent duplicate follows
);

-- Poll options table for poll-type posts
CREATE TABLE IF NOT EXISTS poll_options (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  text VARCHAR(255) NOT NULL,
  votes INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE
);

-- Poll votes table for tracking individual votes on poll options
CREATE TABLE IF NOT EXISTS poll_votes (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  option_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY vote_once (option_id, user_id, character_id),
  FOREIGN KEY (option_id) REFERENCES poll_options(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Event responses table for tracking user responses to events
CREATE TABLE IF NOT EXISTS event_responses (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  post_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED NOT NULL,
  response_type ENUM('interested', 'going') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_response (post_id, user_id, character_id),
  FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE CASCADE
);

-- Threads table for organizing conversations
CREATE TABLE IF NOT EXISTS threads (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  creator_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED, -- Optional: Thread can be created by a character
  privacy ENUM('public', 'private', 'invite-only') NOT NULL DEFAULT 'public',
  status ENUM('active', 'locked', 'archived') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);

-- Thread participants table
CREATE TABLE IF NOT EXISTS thread_participants (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED, -- Optional: Participant can be a character
  is_admin BOOLEAN DEFAULT FALSE, -- Thread administrators can manage the thread
  joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_read_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
  UNIQUE KEY (thread_id, user_id, character_id) -- Prevent duplicate participants
);

-- Thread messages table
CREATE TABLE IF NOT EXISTS thread_messages (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id INT UNSIGNED NOT NULL,
  sender_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED, -- Optional: Message can be from a character
  content TEXT NOT NULL,
  has_media BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL
);

-- Thread message media table
CREATE TABLE IF NOT EXISTS thread_message_media (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id INT UNSIGNED NOT NULL,
  media_id INT UNSIGNED NOT NULL,
  display_order INT DEFAULT 0,
  FOREIGN KEY (message_id) REFERENCES thread_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (media_id) REFERENCES media(id) ON DELETE CASCADE
);

-- Thread reactions table
CREATE TABLE IF NOT EXISTS thread_message_reactions (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  message_id INT UNSIGNED NOT NULL,
  user_id INT UNSIGNED NOT NULL,
  character_id INT UNSIGNED, -- Optional: Reaction can be from a character
  reaction_type VARCHAR(50) NOT NULL, -- e.g., "like", "love", "laugh"
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (message_id) REFERENCES thread_messages(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (character_id) REFERENCES characters(id) ON DELETE SET NULL,
  UNIQUE KEY (message_id, user_id, character_id, reaction_type) -- Prevent duplicate reactions
);

-- Thread invitations table
CREATE TABLE IF NOT EXISTS thread_invitations (
  id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  thread_id INT UNSIGNED NOT NULL,
  inviter_id INT UNSIGNED NOT NULL,
  invitee_id INT UNSIGNED NOT NULL,
  status ENUM('pending', 'accepted', 'declined') NOT NULL DEFAULT 'pending',
  invited_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  responded_at TIMESTAMP NULL,
  FOREIGN KEY (thread_id) REFERENCES threads(id) ON DELETE CASCADE,
  FOREIGN KEY (inviter_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (invitee_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY (thread_id, inviter_id, invitee_id) -- Prevent duplicate invitations
);

-- Add missing columns to characters table (for existing DBs)
ALTER TABLE characters
  ADD COLUMN birthday DATE NULL AFTER age,
  ADD COLUMN zodiac VARCHAR(50) NULL AFTER birthday,
  ADD COLUMN hometown VARCHAR(100) NULL AFTER zodiac,
  ADD COLUMN education VARCHAR(100) NULL AFTER hometown,
  ADD COLUMN occupation VARCHAR(100) NULL AFTER education,
  ADD COLUMN sexuality VARCHAR(50) NULL AFTER occupation,
  ADD COLUMN pronouns VARCHAR(50) NULL AFTER sexuality,
  ADD COLUMN languages VARCHAR(100) NULL AFTER pronouns,
  ADD COLUMN religion VARCHAR(50) NULL AFTER languages,
  ADD COLUMN strengths TEXT NULL AFTER personality,
  ADD COLUMN weaknesses TEXT NULL AFTER strengths,
  ADD COLUMN favFood VARCHAR(100) NULL AFTER weaknesses,
  ADD COLUMN favMusic VARCHAR(100) NULL AFTER favFood,
  ADD COLUMN favMovies VARCHAR(100) NULL AFTER favMusic,
  ADD COLUMN favColor VARCHAR(50) NULL AFTER favMovies,
  ADD COLUMN favSports VARCHAR(100) NULL AFTER favColor,
  ADD COLUMN inspiration TEXT NULL AFTER favSports;

CREATE INDEX poll_options_post_id_idx ON poll_options(post_id);
CREATE INDEX poll_votes_option_id_idx ON poll_votes(option_id);
CREATE INDEX poll_votes_user_character_idx ON poll_votes(user_id, character_id);
CREATE INDEX event_responses_post_id_idx ON event_responses(post_id);
CREATE INDEX event_responses_user_character_idx ON event_responses(user_id, character_id);

CREATE INDEX thread_participants_thread_id_idx ON thread_participants(thread_id);
CREATE INDEX thread_participants_user_character_idx ON thread_participants(user_id, character_id);
CREATE INDEX thread_messages_thread_id_idx ON thread_messages(thread_id);
CREATE INDEX thread_messages_sender_idx ON thread_messages(sender_id, character_id);
CREATE INDEX thread_message_reactions_message_id_idx ON thread_message_reactions(message_id);
CREATE INDEX thread_invitations_thread_id_idx ON thread_invitations(thread_id);
CREATE INDEX thread_invitations_invitee_id_idx ON thread_invitations(invitee_id);