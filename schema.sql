--
-- PostgreSQL database dump
--

\restrict 98W5y4id5mmwuBCWV3Rd6Ye3A8gjEfTOUAgJWJPXIcSxHAShGj6V01BIQBeF7Kd

-- Dumped from database version 18.6 (c5250a2)
-- Dumped by pg_dump version 18.6

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

-- *not* creating schema, since initdb creates it


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS '';


--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: AuthProvider; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."AuthProvider" AS ENUM (
    'EMAIL',
    'GOOGLE'
);


--
-- Name: BoxLevel; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."BoxLevel" AS ENUM (
    'BOX_1',
    'BOX_2',
    'BOX_3',
    'BOX_4',
    'BOX_5',
    'BOX_6',
    'BOX_7'
);


--
-- Name: ChannelStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ChannelStatus" AS ENUM (
    'ACTIVE',
    'ARCHIVED'
);


--
-- Name: DeckStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeckStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: DeckVisibility; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."DeckVisibility" AS ENUM (
    'PRIVATE',
    'PUBLIC'
);


--
-- Name: ExamCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExamCategory" AS ENUM (
    'TOEIC',
    'IELTS',
    'GENERAL'
);


--
-- Name: ExamStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."ExamStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE',
    'OUTDATED'
);


--
-- Name: Gender; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."Gender" AS ENUM (
    'MALE',
    'FEMALE',
    'OTHER'
);


--
-- Name: NewsCategory; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NewsCategory" AS ENUM (
    'GENERAL',
    'EXAM_TIPS',
    'ANNOUNCEMENT',
    'SYSTEM_UPDATE',
    'FEATURED'
);


--
-- Name: NewsStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."NewsStatus" AS ENUM (
    'DRAFT',
    'PUBLISHED',
    'ARCHIVED'
);


--
-- Name: PermissionAction; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PermissionAction" AS ENUM (
    'CREATE',
    'READ',
    'UPDATE',
    'DELETE'
);


--
-- Name: PermissionScope; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PermissionScope" AS ENUM (
    'SYSTEM_WISE',
    'USER_WISE'
);


--
-- Name: PostStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."PostStatus" AS ENUM (
    'PUBLISHED',
    'ARCHIVED',
    'LOCKED',
    'HIDDEN'
);


--
-- Name: QuestionStatus; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."QuestionStatus" AS ENUM (
    'ACTIVE',
    'INACTIVE'
);


--
-- Name: VoteType; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public."VoteType" AS ENUM (
    'UPVOTE',
    'DOWNVOTE'
);


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: ChatChannel; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatChannel" (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    icon text,
    status public."ChannelStatus" DEFAULT 'ACTIVE'::public."ChannelStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ChatMessage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ChatMessage" (
    id text NOT NULL,
    "channelId" text NOT NULL,
    "senderId" text NOT NULL,
    content text NOT NULL,
    attachments text[],
    "parentId" text,
    "isEdited" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Deck; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Deck" (
    id text NOT NULL,
    name text NOT NULL,
    description text,
    category public."ExamCategory" NOT NULL,
    visibility public."DeckVisibility" DEFAULT 'PRIVATE'::public."DeckVisibility" NOT NULL,
    "creatorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."DeckStatus" DEFAULT 'ACTIVE'::public."DeckStatus" NOT NULL
);


--
-- Name: Exam; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Exam" (
    name text NOT NULL,
    category public."ExamCategory" NOT NULL,
    "time" integer NOT NULL,
    status public."ExamStatus" DEFAULT 'ACTIVE'::public."ExamStatus" NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    id integer NOT NULL
);


--
-- Name: ExamHistory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExamHistory" (
    id text NOT NULL,
    "userId" text NOT NULL,
    score integer NOT NULL,
    "totalQuestions" integer NOT NULL,
    "correctQuestions" integer NOT NULL,
    "isPassed" boolean NOT NULL,
    answers jsonb NOT NULL,
    "startedAt" timestamp(3) without time zone NOT NULL,
    "submittedAt" timestamp(3) without time zone NOT NULL,
    "timeTakenSeconds" integer NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "examId" integer NOT NULL
);


--
-- Name: ExamPart; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExamPart" (
    id text NOT NULL,
    "partNumber" integer NOT NULL,
    name text NOT NULL,
    instructions text,
    "audioPath" text,
    "sortOrder" integer DEFAULT 1 NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "examId" integer NOT NULL
);


--
-- Name: ExamQuestion; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ExamQuestion" (
    "sortOrder" integer NOT NULL,
    "partId" text NOT NULL,
    "questionId" integer NOT NULL
);


--
-- Name: Exam_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Exam_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Exam_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Exam_id_seq" OWNED BY public."Exam".id;


--
-- Name: Flashcard; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Flashcard" (
    id text NOT NULL,
    "deckId" text NOT NULL,
    "frontContent" text NOT NULL,
    "backContent" text NOT NULL,
    explanation text,
    "imagePath" text,
    "audioPath" text,
    "partNumber" integer,
    "creatorId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    status public."DeckStatus" DEFAULT 'ACTIVE'::public."DeckStatus" NOT NULL
);


--
-- Name: FlashcardProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."FlashcardProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "flashcardId" text NOT NULL,
    box public."BoxLevel" DEFAULT 'BOX_1'::public."BoxLevel" NOT NULL,
    "intervalDays" integer DEFAULT 1 NOT NULL,
    "easeFactor" double precision DEFAULT 2.5 NOT NULL,
    repetitions integer DEFAULT 0 NOT NULL,
    "nextReviewAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "lastReviewedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ForumCategory; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumCategory" (
    id text NOT NULL,
    name character varying(100) NOT NULL,
    slug character varying(100) NOT NULL,
    description text,
    icon text,
    "isPrivate" boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ForumComment; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumComment" (
    id text NOT NULL,
    content text NOT NULL,
    "isEdited" boolean DEFAULT false NOT NULL,
    "upvotesCount" integer DEFAULT 0 NOT NULL,
    "downvotesCount" integer DEFAULT 0 NOT NULL,
    "postId" text NOT NULL,
    "authorId" text NOT NULL,
    "parentId" text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ForumCommentVote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumCommentVote" (
    id text NOT NULL,
    type public."VoteType" NOT NULL,
    "userId" text NOT NULL,
    "commentId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: ForumPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumPost" (
    id text NOT NULL,
    title character varying(255) NOT NULL,
    slug character varying(255) NOT NULL,
    content text NOT NULL,
    attachments text[],
    status public."PostStatus" DEFAULT 'PUBLISHED'::public."PostStatus" NOT NULL,
    "isPinned" boolean DEFAULT false NOT NULL,
    "isLocked" boolean DEFAULT false NOT NULL,
    "viewsCount" integer DEFAULT 0 NOT NULL,
    "upvotesCount" integer DEFAULT 0 NOT NULL,
    "downvotesCount" integer DEFAULT 0 NOT NULL,
    "categoryId" text NOT NULL,
    "authorId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: ForumPostVote; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."ForumPostVote" (
    id text NOT NULL,
    type public."VoteType" NOT NULL,
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: News; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."News" (
    id text NOT NULL,
    title text NOT NULL,
    slug text NOT NULL,
    summary text,
    content text NOT NULL,
    thumbnail text,
    category public."NewsCategory" DEFAULT 'GENERAL'::public."NewsCategory" NOT NULL,
    status public."NewsStatus" DEFAULT 'DRAFT'::public."NewsStatus" NOT NULL,
    "viewsCount" integer DEFAULT 0 NOT NULL,
    "authorName" text DEFAULT 'Admin'::text,
    "publishedAt" timestamp(3) without time zone,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: NewsTag; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NewsTag" (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    slug text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: NewsTagRelation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."NewsTagRelation" (
    "newsId" text NOT NULL,
    "tagId" integer NOT NULL
);


--
-- Name: NewsTag_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."NewsTag_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: NewsTag_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."NewsTag_id_seq" OWNED BY public."NewsTag".id;


--
-- Name: Permission; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Permission" (
    id integer NOT NULL,
    "roleId" integer NOT NULL,
    resource text NOT NULL,
    scope public."PermissionScope" NOT NULL,
    permission public."PermissionAction" NOT NULL,
    allowed boolean DEFAULT false NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Permission_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Permission_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Permission_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Permission_id_seq" OWNED BY public."Permission".id;


--
-- Name: Question; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Question" (
    content text NOT NULL,
    options jsonb NOT NULL,
    category public."ExamCategory" NOT NULL,
    explanation text,
    status public."QuestionStatus" DEFAULT 'ACTIVE'::public."QuestionStatus" NOT NULL,
    "topicNumber" integer,
    "lastEditedById" text,
    "lastEditedBy" jsonb,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    right_answer text NOT NULL,
    "audioPath" text,
    "imagePath" text,
    "partNumber" integer,
    id integer NOT NULL
);


--
-- Name: Question_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Question_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Question_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Question_id_seq" OWNED BY public."Question".id;


--
-- Name: Role; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."Role" (
    id integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL
);


--
-- Name: Role_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public."Role_id_seq"
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: Role_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public."Role_id_seq" OWNED BY public."Role".id;


--
-- Name: SavedPost; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."SavedPost" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "postId" text NOT NULL,
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: User; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."User" (
    id text NOT NULL,
    email text NOT NULL,
    password text,
    name text NOT NULL,
    "phoneNumber" text,
    gender public."Gender",
    provider public."AuthProvider" DEFAULT 'EMAIL'::public."AuthProvider" NOT NULL,
    "refreshTokens" text[],
    "createdAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    "updatedAt" timestamp(3) without time zone NOT NULL,
    "roleId" integer
);


--
-- Name: UserDeckProgress; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."UserDeckProgress" (
    id text NOT NULL,
    "userId" text NOT NULL,
    "deckId" text NOT NULL,
    "totalCardsViewed" integer DEFAULT 0 NOT NULL,
    "masteredCards" integer DEFAULT 0 NOT NULL,
    "lastStudiedAt" timestamp(3) without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


--
-- Name: _prisma_migrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public._prisma_migrations (
    id character varying(36) NOT NULL,
    checksum character varying(64) NOT NULL,
    finished_at timestamp with time zone,
    migration_name character varying(255) NOT NULL,
    logs text,
    rolled_back_at timestamp with time zone,
    started_at timestamp with time zone DEFAULT now() NOT NULL,
    applied_steps_count integer DEFAULT 0 NOT NULL
);


--
-- Name: Exam id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Exam" ALTER COLUMN id SET DEFAULT nextval('public."Exam_id_seq"'::regclass);


--
-- Name: NewsTag id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsTag" ALTER COLUMN id SET DEFAULT nextval('public."NewsTag_id_seq"'::regclass);


--
-- Name: Permission id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission" ALTER COLUMN id SET DEFAULT nextval('public."Permission_id_seq"'::regclass);


--
-- Name: Question id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Question" ALTER COLUMN id SET DEFAULT nextval('public."Question_id_seq"'::regclass);


--
-- Name: Role id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role" ALTER COLUMN id SET DEFAULT nextval('public."Role_id_seq"'::regclass);


--
-- Name: ChatChannel ChatChannel_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatChannel"
    ADD CONSTRAINT "ChatChannel_pkey" PRIMARY KEY (id);


--
-- Name: ChatMessage ChatMessage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_pkey" PRIMARY KEY (id);


--
-- Name: Deck Deck_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Deck"
    ADD CONSTRAINT "Deck_pkey" PRIMARY KEY (id);


--
-- Name: ExamHistory ExamHistory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamHistory"
    ADD CONSTRAINT "ExamHistory_pkey" PRIMARY KEY (id);


--
-- Name: ExamPart ExamPart_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamPart"
    ADD CONSTRAINT "ExamPart_pkey" PRIMARY KEY (id);


--
-- Name: ExamQuestion ExamQuestion_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamQuestion"
    ADD CONSTRAINT "ExamQuestion_pkey" PRIMARY KEY ("partId", "questionId");


--
-- Name: Exam Exam_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Exam"
    ADD CONSTRAINT "Exam_pkey" PRIMARY KEY (id);


--
-- Name: FlashcardProgress FlashcardProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FlashcardProgress"
    ADD CONSTRAINT "FlashcardProgress_pkey" PRIMARY KEY (id);


--
-- Name: Flashcard Flashcard_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Flashcard"
    ADD CONSTRAINT "Flashcard_pkey" PRIMARY KEY (id);


--
-- Name: ForumCategory ForumCategory_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumCategory"
    ADD CONSTRAINT "ForumCategory_pkey" PRIMARY KEY (id);


--
-- Name: ForumCommentVote ForumCommentVote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumCommentVote"
    ADD CONSTRAINT "ForumCommentVote_pkey" PRIMARY KEY (id);


--
-- Name: ForumComment ForumComment_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumComment"
    ADD CONSTRAINT "ForumComment_pkey" PRIMARY KEY (id);


--
-- Name: ForumPostVote ForumPostVote_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumPostVote"
    ADD CONSTRAINT "ForumPostVote_pkey" PRIMARY KEY (id);


--
-- Name: ForumPost ForumPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumPost"
    ADD CONSTRAINT "ForumPost_pkey" PRIMARY KEY (id);


--
-- Name: NewsTagRelation NewsTagRelation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsTagRelation"
    ADD CONSTRAINT "NewsTagRelation_pkey" PRIMARY KEY ("newsId", "tagId");


--
-- Name: NewsTag NewsTag_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsTag"
    ADD CONSTRAINT "NewsTag_pkey" PRIMARY KEY (id);


--
-- Name: News News_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."News"
    ADD CONSTRAINT "News_pkey" PRIMARY KEY (id);


--
-- Name: Permission Permission_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_pkey" PRIMARY KEY (id);


--
-- Name: Question Question_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Question"
    ADD CONSTRAINT "Question_pkey" PRIMARY KEY (id);


--
-- Name: Role Role_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Role"
    ADD CONSTRAINT "Role_pkey" PRIMARY KEY (id);


--
-- Name: SavedPost SavedPost_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SavedPost"
    ADD CONSTRAINT "SavedPost_pkey" PRIMARY KEY (id);


--
-- Name: UserDeckProgress UserDeckProgress_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserDeckProgress"
    ADD CONSTRAINT "UserDeckProgress_pkey" PRIMARY KEY (id);


--
-- Name: User User_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_pkey" PRIMARY KEY (id);


--
-- Name: _prisma_migrations _prisma_migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public._prisma_migrations
    ADD CONSTRAINT _prisma_migrations_pkey PRIMARY KEY (id);


--
-- Name: ChatMessage_channelId_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatMessage_channelId_createdAt_idx" ON public."ChatMessage" USING btree ("channelId", "createdAt");


--
-- Name: ChatMessage_senderId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ChatMessage_senderId_idx" ON public."ChatMessage" USING btree ("senderId");


--
-- Name: Deck_creatorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Deck_creatorId_idx" ON public."Deck" USING btree ("creatorId");


--
-- Name: ExamHistory_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExamHistory_examId_idx" ON public."ExamHistory" USING btree ("examId");


--
-- Name: ExamHistory_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExamHistory_userId_idx" ON public."ExamHistory" USING btree ("userId");


--
-- Name: ExamPart_examId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExamPart_examId_idx" ON public."ExamPart" USING btree ("examId");


--
-- Name: ExamPart_examId_partNumber_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ExamPart_examId_partNumber_key" ON public."ExamPart" USING btree ("examId", "partNumber");


--
-- Name: ExamQuestion_questionId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ExamQuestion_questionId_idx" ON public."ExamQuestion" USING btree ("questionId");


--
-- Name: FlashcardProgress_userId_flashcardId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "FlashcardProgress_userId_flashcardId_key" ON public."FlashcardProgress" USING btree ("userId", "flashcardId");


--
-- Name: FlashcardProgress_userId_nextReviewAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "FlashcardProgress_userId_nextReviewAt_idx" ON public."FlashcardProgress" USING btree ("userId", "nextReviewAt");


--
-- Name: Flashcard_creatorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Flashcard_creatorId_idx" ON public."Flashcard" USING btree ("creatorId");


--
-- Name: Flashcard_deckId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "Flashcard_deckId_idx" ON public."Flashcard" USING btree ("deckId");


--
-- Name: ForumCategory_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ForumCategory_name_key" ON public."ForumCategory" USING btree (name);


--
-- Name: ForumCategory_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ForumCategory_slug_key" ON public."ForumCategory" USING btree (slug);


--
-- Name: ForumCommentVote_commentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumCommentVote_commentId_idx" ON public."ForumCommentVote" USING btree ("commentId");


--
-- Name: ForumCommentVote_userId_commentId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ForumCommentVote_userId_commentId_key" ON public."ForumCommentVote" USING btree ("userId", "commentId");


--
-- Name: ForumComment_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumComment_authorId_idx" ON public."ForumComment" USING btree ("authorId");


--
-- Name: ForumComment_parentId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumComment_parentId_idx" ON public."ForumComment" USING btree ("parentId");


--
-- Name: ForumComment_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumComment_postId_idx" ON public."ForumComment" USING btree ("postId");


--
-- Name: ForumPostVote_postId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPostVote_postId_idx" ON public."ForumPostVote" USING btree ("postId");


--
-- Name: ForumPostVote_userId_postId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ForumPostVote_userId_postId_key" ON public."ForumPostVote" USING btree ("userId", "postId");


--
-- Name: ForumPost_authorId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPost_authorId_idx" ON public."ForumPost" USING btree ("authorId");


--
-- Name: ForumPost_categoryId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPost_categoryId_idx" ON public."ForumPost" USING btree ("categoryId");


--
-- Name: ForumPost_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPost_createdAt_idx" ON public."ForumPost" USING btree ("createdAt");


--
-- Name: ForumPost_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "ForumPost_slug_key" ON public."ForumPost" USING btree (slug);


--
-- Name: ForumPost_upvotesCount_createdAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "ForumPost_upvotesCount_createdAt_idx" ON public."ForumPost" USING btree ("upvotesCount", "createdAt");


--
-- Name: NewsTagRelation_tagId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "NewsTagRelation_tagId_idx" ON public."NewsTagRelation" USING btree ("tagId");


--
-- Name: NewsTag_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NewsTag_name_key" ON public."NewsTag" USING btree (name);


--
-- Name: NewsTag_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "NewsTag_slug_key" ON public."NewsTag" USING btree (slug);


--
-- Name: News_slug_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "News_slug_key" ON public."News" USING btree (slug);


--
-- Name: News_status_publishedAt_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "News_status_publishedAt_idx" ON public."News" USING btree (status, "publishedAt");


--
-- Name: Permission_roleId_scope_permission_resource_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Permission_roleId_scope_permission_resource_key" ON public."Permission" USING btree ("roleId", scope, permission, resource);


--
-- Name: Role_name_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "Role_name_key" ON public."Role" USING btree (name);


--
-- Name: SavedPost_userId_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX "SavedPost_userId_idx" ON public."SavedPost" USING btree ("userId");


--
-- Name: SavedPost_userId_postId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "SavedPost_userId_postId_key" ON public."SavedPost" USING btree ("userId", "postId");


--
-- Name: UserDeckProgress_userId_deckId_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "UserDeckProgress_userId_deckId_key" ON public."UserDeckProgress" USING btree ("userId", "deckId");


--
-- Name: User_email_key; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX "User_email_key" ON public."User" USING btree (email);


--
-- Name: ChatMessage ChatMessage_channelId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_channelId_fkey" FOREIGN KEY ("channelId") REFERENCES public."ChatChannel"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ChatMessage ChatMessage_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."ChatMessage"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- Name: ChatMessage ChatMessage_senderId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ChatMessage"
    ADD CONSTRAINT "ChatMessage_senderId_fkey" FOREIGN KEY ("senderId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Deck Deck_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Deck"
    ADD CONSTRAINT "Deck_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamHistory ExamHistory_examId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamHistory"
    ADD CONSTRAINT "ExamHistory_examId_fkey" FOREIGN KEY ("examId") REFERENCES public."Exam"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamHistory ExamHistory_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamHistory"
    ADD CONSTRAINT "ExamHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamPart ExamPart_examId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamPart"
    ADD CONSTRAINT "ExamPart_examId_fkey" FOREIGN KEY ("examId") REFERENCES public."Exam"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamQuestion ExamQuestion_partId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamQuestion"
    ADD CONSTRAINT "ExamQuestion_partId_fkey" FOREIGN KEY ("partId") REFERENCES public."ExamPart"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ExamQuestion ExamQuestion_questionId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ExamQuestion"
    ADD CONSTRAINT "ExamQuestion_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES public."Question"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FlashcardProgress FlashcardProgress_flashcardId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FlashcardProgress"
    ADD CONSTRAINT "FlashcardProgress_flashcardId_fkey" FOREIGN KEY ("flashcardId") REFERENCES public."Flashcard"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: FlashcardProgress FlashcardProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."FlashcardProgress"
    ADD CONSTRAINT "FlashcardProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Flashcard Flashcard_creatorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Flashcard"
    ADD CONSTRAINT "Flashcard_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Flashcard Flashcard_deckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Flashcard"
    ADD CONSTRAINT "Flashcard_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES public."Deck"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumCommentVote ForumCommentVote_commentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumCommentVote"
    ADD CONSTRAINT "ForumCommentVote_commentId_fkey" FOREIGN KEY ("commentId") REFERENCES public."ForumComment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumCommentVote ForumCommentVote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumCommentVote"
    ADD CONSTRAINT "ForumCommentVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumComment ForumComment_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumComment"
    ADD CONSTRAINT "ForumComment_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumComment ForumComment_parentId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumComment"
    ADD CONSTRAINT "ForumComment_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES public."ForumComment"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumComment ForumComment_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumComment"
    ADD CONSTRAINT "ForumComment_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."ForumPost"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumPostVote ForumPostVote_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumPostVote"
    ADD CONSTRAINT "ForumPostVote_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."ForumPost"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumPostVote ForumPostVote_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumPostVote"
    ADD CONSTRAINT "ForumPostVote_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumPost ForumPost_authorId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumPost"
    ADD CONSTRAINT "ForumPost_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: ForumPost ForumPost_categoryId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."ForumPost"
    ADD CONSTRAINT "ForumPost_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES public."ForumCategory"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NewsTagRelation NewsTagRelation_newsId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsTagRelation"
    ADD CONSTRAINT "NewsTagRelation_newsId_fkey" FOREIGN KEY ("newsId") REFERENCES public."News"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: NewsTagRelation NewsTagRelation_tagId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."NewsTagRelation"
    ADD CONSTRAINT "NewsTagRelation_tagId_fkey" FOREIGN KEY ("tagId") REFERENCES public."NewsTag"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: Permission Permission_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."Permission"
    ADD CONSTRAINT "Permission_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SavedPost SavedPost_postId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SavedPost"
    ADD CONSTRAINT "SavedPost_postId_fkey" FOREIGN KEY ("postId") REFERENCES public."ForumPost"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: SavedPost SavedPost_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."SavedPost"
    ADD CONSTRAINT "SavedPost_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserDeckProgress UserDeckProgress_deckId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserDeckProgress"
    ADD CONSTRAINT "UserDeckProgress_deckId_fkey" FOREIGN KEY ("deckId") REFERENCES public."Deck"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: UserDeckProgress UserDeckProgress_userId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."UserDeckProgress"
    ADD CONSTRAINT "UserDeckProgress_userId_fkey" FOREIGN KEY ("userId") REFERENCES public."User"(id) ON UPDATE CASCADE ON DELETE CASCADE;


--
-- Name: User User_roleId_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."User"
    ADD CONSTRAINT "User_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES public."Role"(id) ON UPDATE CASCADE ON DELETE SET NULL;


--
-- PostgreSQL database dump complete
--

\unrestrict 98W5y4id5mmwuBCWV3Rd6Ye3A8gjEfTOUAgJWJPXIcSxHAShGj6V01BIQBeF7Kd

