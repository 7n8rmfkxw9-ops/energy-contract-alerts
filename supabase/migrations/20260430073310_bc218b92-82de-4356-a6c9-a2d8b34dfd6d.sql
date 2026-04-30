-- ============================================
-- CONVERSATIONS (1 par triplet lot+acheteur+producteur)
-- ============================================
CREATE TABLE public.conversations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lot_id UUID NOT NULL REFERENCES public.coffee_lots(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL,
  producer_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (lot_id, buyer_id, producer_id),
  CONSTRAINT conv_distinct_parties CHECK (buyer_id <> producer_id)
);

CREATE INDEX idx_conv_buyer ON public.conversations(buyer_id, last_message_at DESC);
CREATE INDEX idx_conv_producer ON public.conversations(producer_id, last_message_at DESC);

ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants view their conversations"
  ON public.conversations FOR SELECT TO authenticated
  USING (auth.uid() IN (buyer_id, producer_id));

CREATE POLICY "Buyers create conversation on available lot of verified producer"
  ON public.conversations FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = buyer_id
    AND (public.has_role(auth.uid(), 'shop') OR public.has_role(auth.uid(), 'torrefacteur'))
    AND EXISTS (
      SELECT 1 FROM public.coffee_lots l
      JOIN public.profiles p ON p.id = l.producer_id
      WHERE l.id = lot_id
        AND l.producer_id = conversations.producer_id
        AND l.status IN ('available','reserved')
        AND p.verification_status = 'verified'
    )
  );

-- Pas d'UPDATE/DELETE direct par les utilisateurs (seul un trigger met à jour last_message_at)

-- ============================================
-- MESSAGES
-- ============================================
CREATE TABLE public.messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  body TEXT NOT NULL,
  source_lang TEXT,
  translated_body TEXT,
  translated_lang TEXT,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT msg_body_len CHECK (length(body) BETWEEN 1 AND 4000)
);

CREATE INDEX idx_msg_conv ON public.messages(conversation_id, created_at);
CREATE INDEX idx_msg_sender ON public.messages(sender_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Helper pour vérifier l'appartenance à la conversation
CREATE OR REPLACE FUNCTION public.is_conversation_participant(_conv_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.conversations c
    WHERE c.id = _conv_id AND _user_id IN (c.buyer_id, c.producer_id)
  )
$$;
REVOKE EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_conversation_participant(uuid, uuid) TO authenticated;

CREATE POLICY "Participants view messages"
  ON public.messages FOR SELECT TO authenticated
  USING (public.is_conversation_participant(conversation_id, auth.uid()));

CREATE POLICY "Participants send messages"
  ON public.messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_conversation_participant(conversation_id, auth.uid())
  );

-- Permet uniquement de marquer comme lu (read_at) ses messages reçus
CREATE POLICY "Recipients mark as read"
  ON public.messages FOR UPDATE TO authenticated
  USING (
    public.is_conversation_participant(conversation_id, auth.uid())
    AND sender_id <> auth.uid()
  )
  WITH CHECK (
    public.is_conversation_participant(conversation_id, auth.uid())
    AND sender_id <> auth.uid()
  );

-- Trigger : empêche modification de tout sauf read_at
CREATE OR REPLACE FUNCTION public.guard_message_updates()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.body IS DISTINCT FROM OLD.body
     OR NEW.sender_id IS DISTINCT FROM OLD.sender_id
     OR NEW.conversation_id IS DISTINCT FROM OLD.conversation_id
     OR NEW.source_lang IS DISTINCT FROM OLD.source_lang
     OR NEW.translated_body IS DISTINCT FROM OLD.translated_body
     OR NEW.translated_lang IS DISTINCT FROM OLD.translated_lang
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Only read_at can be updated on messages';
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_guard_message_updates
BEFORE UPDATE ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.guard_message_updates();

-- Trigger : met à jour conversations.last_message_at à chaque message
CREATE OR REPLACE FUNCTION public.bump_conversation_last_message()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.conversations
     SET last_message_at = NEW.created_at
   WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER trg_bump_conversation
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.bump_conversation_last_message();

-- ============================================
-- REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.conversations;