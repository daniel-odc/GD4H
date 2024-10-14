Cette partie permet de sélectionner les champs à analyser. Les champs sont associés à des types de champs parmi
lesquels:

| Type            | Détails                                                                                                                                                                   |
|-----------------|---------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| **``Coordonnées``** | Les champs de type `longitude`, `latitude`. Ces champs seront représentés sur une carte en partie vérification.                                                           |
| **``Adresse``**     | Les champs de type `adresse`, `rue`, `commune`, `code INSEE` etc. Ces champs pourront constituer une adresse à convertir en longitude et latitude en partie vérification. |
| **``Dates``**       | Les champs de type `date`. Ces champs seront analysés dans une version ultérieure de l'application.                                                                        |
| **``Autres``**      | Tous les autres champs qui ne sont pas traités dans la partie vérification.                                                                                               |

### Instructions pour sélectionner les champs à analyser:

La première colonne liste les noms de champs apparaissant dans le fichier CSV sélectionné en partie précédente.

- Vérifier dans la colonne **``% Complet``** que le niveau de complétude des enregistrements est bien celui désiré (une valeure inférieure à 100% indique que des enregistrements vides sont présents dans la donnée)
- Éventuellement mettre à jour la valeur de la colonne **``Type``** si le champ n'a pas été correctement identifié.
- Cliquer sur **`à vérifier`** si vous souhaitez analyser la colonne en cours.

