ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS sales_config jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE service_plans ADD COLUMN IF NOT EXISTS media_url text;

WITH bid AS (
  SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1
), offer_services(name, description) AS (
  VALUES
    ('Apple Music','Abonnement Apple Music.'),
    ('Gemini Google AI Pro','Google AI Pro.'),
    ('Pack streaming illimité','Pack de plateformes de streaming, Android uniquement.'),
    ('ChatGPT Premium','Abonnement ChatGPT Premium.'),
    ('LinkedIn Premium','Abonnement LinkedIn Premium.'),
    ('Prime Video','Abonnement Amazon Prime Video.'),
    ('CapCut Pro','Abonnement CapCut Pro.'),
    ('Spotify Premium','Abonnement Spotify Premium.'),
    ('Canva Pro','Abonnement Canva Pro.'),
    ('Crunchyroll Premium','Abonnement Crunchyroll Premium.'),
    ('IPTV','Service IPTV.'),
    ('Deezer Premium','Abonnement Deezer Premium.'),
    ('Netflix','Abonnement Netflix.')
)
INSERT INTO services (business_id,name,description,active)
SELECT bid.id, os.name, os.description, true
FROM bid CROSS JOIN offer_services os
WHERE NOT EXISTS (
  SELECT 1 FROM services s WHERE s.business_id=bid.id AND lower(s.name)=lower(os.name)
);

WITH bid AS (
  SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1
), offers(service_name, plan_name, price, duration_days, lifetime, sales_config) AS (
  VALUES
    ('Apple Music','1 mois',1500::numeric,30,false,'{"pricingMode":"fixed","floorPrice":1500,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Apple Music','À vie Android',2500::numeric,NULL,true,'{"pricingMode":"fixed","floorPrice":2500,"humanBelowFloor":true,"platform":"android_only","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"Android uniquement"}'::jsonb),
    ('Gemini Google AI Pro','18 mois',6500::numeric,540,false,'{"pricingMode":"negotiable","firstConcession":4500,"floorPrice":4000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Pack streaming illimité','À vie Android',10500::numeric,NULL,true,'{"pricingMode":"fixed","floorPrice":10500,"humanBelowFloor":true,"platform":"android_only","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"Android uniquement; inclut les plateformes présentées sur la fiche"}'::jsonb),
    ('ChatGPT Premium','1 mois',3500::numeric,30,false,'{"pricingMode":"negotiable","firstConcession":3000,"floorPrice":2500,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('LinkedIn Premium','1 mois',3750::numeric,30,false,'{"pricingMode":"negotiable","firstConcession":3000,"floorPrice":3000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Prime Video','1 mois',1250::numeric,30,false,'{"pricingMode":"promo_recall","promoRecallPrice":950,"floorPrice":950,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"950 FCFA uniquement si le client évoque une ancienne promotion"}'::jsonb),
    ('CapCut Pro','1 mois',1250::numeric,30,false,'{"pricingMode":"fixed","floorPrice":1250,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Spotify Premium','3 mois',2500::numeric,90,false,'{"pricingMode":"negotiable","firstConcession":2000,"floorPrice":1500,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Canva Pro','1 an',6500::numeric,365,false,'{"pricingMode":"negotiable","firstConcession":4500,"floorPrice":4000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Crunchyroll Premium','1 mois',1250::numeric,30,false,'{"pricingMode":"promo_recall","promoRecallPrice":1000,"floorPrice":900,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"Si une ancienne promotion est évoquée, proposer 1000 FCFA; 900 FCFA seulement en dernier recours"}'::jsonb),
    ('IPTV','8 mois',14000::numeric,240,false,'{"pricingMode":"negotiable","firstConcession":10000,"floorPrice":10000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"Alternative disponible: formule 3 mois à 4000 FCFA"}'::jsonb),
    ('IPTV','3 mois',4000::numeric,90,false,'{"pricingMode":"fixed","floorPrice":4000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Deezer Premium','1 mois',1550::numeric,30,false,'{"pricingMode":"fixed","floorPrice":1550,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Netflix','1 mois',1250::numeric,30,false,'{"pricingMode":"promo_recall","promoRecallPrice":950,"floorPrice":950,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"950 FCFA si le client évoque une ancienne promotion"}'::jsonb),
    ('CapCut Pro','À vie',5500::numeric,NULL,true,'{"pricingMode":"negotiable","firstConcession":4000,"floorPrice":3500,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb)
)
INSERT INTO service_plans (service_id,name,price,currency,duration_days,lifetime,active,sales_config)
SELECT s.id,o.plan_name,o.price,'XAF',o.duration_days,o.lifetime,true,o.sales_config
FROM offers o
JOIN bid ON true
JOIN services s ON s.business_id=bid.id AND lower(s.name)=lower(o.service_name)
WHERE NOT EXISTS (
  SELECT 1 FROM service_plans sp WHERE sp.service_id=s.id AND lower(sp.name)=lower(o.plan_name)
);

WITH bid AS (
  SELECT id FROM businesses ORDER BY created_at ASC LIMIT 1
), offers(service_name, plan_name, price, duration_days, lifetime, sales_config) AS (
  VALUES
    ('Apple Music','1 mois',1500::numeric,30,false,'{"pricingMode":"fixed","floorPrice":1500,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Apple Music','À vie Android',2500::numeric,NULL,true,'{"pricingMode":"fixed","floorPrice":2500,"humanBelowFloor":true,"platform":"android_only","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"Android uniquement"}'::jsonb),
    ('Gemini Google AI Pro','18 mois',6500::numeric,540,false,'{"pricingMode":"negotiable","firstConcession":4500,"floorPrice":4000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Pack streaming illimité','À vie Android',10500::numeric,NULL,true,'{"pricingMode":"fixed","floorPrice":10500,"humanBelowFloor":true,"platform":"android_only","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"Android uniquement; inclut les plateformes présentées sur la fiche"}'::jsonb),
    ('ChatGPT Premium','1 mois',3500::numeric,30,false,'{"pricingMode":"negotiable","firstConcession":3000,"floorPrice":2500,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('LinkedIn Premium','1 mois',3750::numeric,30,false,'{"pricingMode":"negotiable","firstConcession":3000,"floorPrice":3000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Prime Video','1 mois',1250::numeric,30,false,'{"pricingMode":"promo_recall","promoRecallPrice":950,"floorPrice":950,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"950 FCFA uniquement si le client évoque une ancienne promotion"}'::jsonb),
    ('CapCut Pro','1 mois',1250::numeric,30,false,'{"pricingMode":"fixed","floorPrice":1250,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Spotify Premium','3 mois',2500::numeric,90,false,'{"pricingMode":"negotiable","firstConcession":2000,"floorPrice":1500,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Canva Pro','1 an',6500::numeric,365,false,'{"pricingMode":"negotiable","firstConcession":4500,"floorPrice":4000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Crunchyroll Premium','1 mois',1250::numeric,30,false,'{"pricingMode":"promo_recall","promoRecallPrice":1000,"floorPrice":900,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"Si une ancienne promotion est évoquée, proposer 1000 FCFA; 900 FCFA seulement en dernier recours"}'::jsonb),
    ('IPTV','8 mois',14000::numeric,240,false,'{"pricingMode":"negotiable","firstConcession":10000,"floorPrice":10000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"Alternative disponible: formule 3 mois à 4000 FCFA"}'::jsonb),
    ('IPTV','3 mois',4000::numeric,90,false,'{"pricingMode":"fixed","floorPrice":4000,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Deezer Premium','1 mois',1550::numeric,30,false,'{"pricingMode":"fixed","floorPrice":1550,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb),
    ('Netflix','1 mois',1250::numeric,30,false,'{"pricingMode":"promo_recall","promoRecallPrice":950,"floorPrice":950,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true,"salesNotes":"950 FCFA si le client évoque une ancienne promotion"}'::jsonb),
    ('CapCut Pro','À vie',5500::numeric,NULL,true,'{"pricingMode":"negotiable","firstConcession":4000,"floorPrice":3500,"humanBelowFloor":true,"platform":"all","sendMediaOnPriceRequest":true,"aiSalesEnabled":true}'::jsonb)
)
UPDATE service_plans sp
SET price=o.price,
    currency='XAF',
    duration_days=o.duration_days,
    lifetime=o.lifetime,
    active=true,
    sales_config=o.sales_config,
    updated_at=now()
FROM offers o, bid
JOIN services s ON s.business_id=bid.id
WHERE sp.service_id=s.id
  AND lower(s.name)=lower(o.service_name)
  AND lower(sp.name)=lower(o.plan_name);
