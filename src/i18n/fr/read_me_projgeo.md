Cette section permet de projeter les coordonnées géographiques d’une base de données d’un système de projection vers un autre.

Cela permet notamment d’harmoniser les références spatiales et de garantir la compatibilité des données géographiques avec différents outils d’analyse et de visualisation.

Cette section utilise Proj4 pour la conversion des coordonnées, disponible ici :

> https://proj.org/ , https://github.com/proj4js/proj4js

1. Sélectionner le système de projection d’entrée et de sortie

   ==> Les nouveaux champs **`longitude_proj`** et **`latitude_reproj`** sont ajoutés en fin de tableau (proj étant le sytème choisi par l'utilisateur).

2. Si des champs de coordonnées de type `longitude` et `latitude` sont présents dans la table:

   - Cliquer sur **`Projection`** afin de voir la projection.

3. Cliquer sur **`Extraire les données`** pour obtenir la table avec les coordonnées projetées.
