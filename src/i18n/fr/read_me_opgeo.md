
Cette section permet de convertir les adresses de la base de données en coordonnées géographiques (latitude, longitude).

Cela permet notamment de vérifier la bonne localisation des adresses.

Cette section utilise l'API Adresse Base Adresse Nationale, disponible ici:

> https://adresse.data.gouv.fr/api-doc/adresse

1. Cliquer sur **`Convertir en lat, lng`** pour convertir les adresses en coordonnées (cela peut prendre un certain temps pour un grand nombre d'adresses) 

   ==> Les nouveaux champs `lat_api_adresse` et `lng_api_adresse` sont créés en fin de tableau.

2. Si des champs de coordonnées de type `longitude` et `latitude` sont présents dans la table:
   - Cliquer sur **`Comparer avec les coordonnées existantes`** pour calculer la distance entre adresse et coordonnées.
   - Visualiser cette distance dans la nouvelle colonne `distance_coord_adresses_km`
3. Cliquer sur **`Exporter les données`** pour obtenir la table avec les coordonnées ajoutées.