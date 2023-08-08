# Custom Asset Types (Proof of Concept)

This branch contains a working implementation of custom asset types in OpenRemote.

The custom asset types are stored in the `CUSTOM_ASSET_TYPE` table.

Custom asset types can be added by executing some SQL, e.g.:

```sql
INSERT INTO openremote.custom_asset_type (id,"name",icon,colour) VALUES
	('2wzKB2j39144oTzAJnHpfs','CustomType1','wind-turbine','ff0000'),
	('4GRO4nqbN7FCxuySrV220B','CustomType2','account-multiple','0000ff');


INSERT INTO openremote.custom_asset_type (id,"name",icon,colour) VALUES
	('4RYkKKuM1wOw21PNOgHShZ','CustomType3','power','00ff00'),
	('3QlH8nQWvnevcyxat6tQKJ','CustomType4','car-electric','ff00ff');
```

After executing the SQL the UI needs to be manually reloaded before custom asset type changes show.
This could be improved by adding an event that triggers the UI to automatically update the asset types on changes.

Unfortunately JPA does not provide a way to update the type of entities mapped to the `UnknownAsset`.
To workaround this limitation a native query is used instead.
