-- Generate random gaming handles for users who skipped onboarding (handle IS NULL)
DO $$
DECLARE
  rec     RECORD;
  adj     TEXT[];
  noun    TEXT[];
  new_handle TEXT;
BEGIN
  adj := ARRAY[
    'swift','dark','noble','fierce','brave','silent','wild','bold','sharp','iron',
    'golden','silver','ghost','storm','frost','ember','void','neon','pixel','turbo',
    'alpha','elite','prime','ultra','mega','hyper','atomic','solar','lunar','cosmic'
  ];
  noun := ARRAY[
    'gamer','player','hunter','knight','ranger','rogue','mage','hero','scout','blade',
    'fox','wolf','hawk','bear','lion','eagle','dragon','phoenix','raven','viper',
    'sniper','warrior','guardian','striker','phantom','shadow','falcon','cobra','apex','forge'
  ];

  FOR rec IN
    SELECT id FROM profiles
    WHERE handle IS NULL OR handle = 'user'
  LOOP
    LOOP
      new_handle :=
        adj[1 + floor(random() * array_length(adj, 1))::int]
        || '_'
        || noun[1 + floor(random() * array_length(noun, 1))::int]
        || floor(random() * 9000 + 1000)::int::text;
      EXIT WHEN NOT EXISTS (SELECT 1 FROM profiles WHERE handle = new_handle);
    END LOOP;

    UPDATE profiles SET handle = new_handle WHERE id = rec.id;
    RAISE NOTICE 'Assigned handle % to user %', new_handle, rec.id;
  END LOOP;
END
$$;
