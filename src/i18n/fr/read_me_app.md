### Documentation Application *QualiGeoEnvi*

Cette application est issue du défi [QualiGeoEnvi](https://challenge.gd4h.ecologie.gouv.fr/defi/?topic=28), proposé par l'[INERIS](https://www.ineris.fr/fr) et lancé dans le cadre du [Challenge Green Data for Health](https://challenge.gd4h.ecologie.gouv.fr/), lancé par ECOLAB, le laboratoire d’innovation pour la transition écologique du Commissariat Général au Développement Durable.

Cette application permet à un public non averti de visualiser des **données géographiques** contenues dans un fichier CSV.

Elle permet:
- d'estimer le pourcentage d'enregistrements présents dans la donnée pour chaque champ.
- de visualiser des longitudes et latitudes sur une carte.
- de **convertir des adresses** en longitude et latitude (au moyen de l'[API Adresse](https://adresse.data.gouv.fr/api-doc/adresse)  de la Base Adresse Nationale)
- de vérifier la cohérence des adresses renseignées par calcul de distances aux longitudes et latitudes renseignées.

Sur chaque onlget, une section `Instructions` donne les indications à suivre.

Pour toute remarque ou demande de renseignements, vous pouvez les adresser sur le [Gitlab](https://gitlab.com/data-challenge-gd4h/qualigeoenvi/-/issues) du projet.

*Restrictions:*
- Seules les données tabulaires sont traitées (lignes et colonnes) 
- Il ne peut y avoir de doublons dans les noms de colonnes.
- Si des virgules sont présentes dans les champs d'adresses, mieux vaut les retirer avant conversion en longitude latitude.
- L'application n'est pas optimisée pour des fichiers très volumineux (>1M de lignes)
- L'application ne gère pour l'instant que les fichiers **CSV**.
- L'application ne gère pas la multiplicité des systèmes de coordonnées géographiques dans le jeu de données : privilégier des jeux de données avec un système de coordonnées géographiques unique, de préférence WGS84.

*Note:* Le code permettant de créer cette application est 100% open-source et disponible également sur le [Gitlab](https://gitlab.com/data-challenge-gd4h/qualigeoenvi/-/tree/main/) du projet.
