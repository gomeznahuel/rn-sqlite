import { StatusBar } from "expo-status-bar";
import React, { useState, useEffect } from "react";
import { StyleSheet, Text, View, TextInput, Button, Platform, Alert } from "react-native";
import * as SQLite from "expo-sqlite";
import * as Sharing from "expo-sharing";
import * as FileSystem from "expo-file-system";
import * as DocumentPicker from "expo-document-picker";


export default function App() {
  const [db, setDb] = useState(SQLite.openDatabase("example.db"));
  const [isLoading, setIsLoading] = useState(true);
  const [names, setNames] = useState([]);
  const [currentName, setCurrentName] = useState(undefined);

  const exportDb = async () => {
    if (Platform.OS === "android") {
      const permissions =
        await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
      if (permissions.granted) {
        const base64 = await FileSystem.readAsStringAsync(
          FileSystem.documentDirectory + "SQLite/example.db",
          {
            encoding: FileSystem.EncodingType.Base64,
          }
        );

        await FileSystem.StorageAccessFramework.createFileAsync(
          permissions.directoryUri,
          "example.db",
          "application/octet-stream"
        )
          .then(async (uri) => {
            await FileSystem.writeAsStringAsync(uri, base64, {
              encoding: FileSystem.EncodingType.Base64,
            });
          })
          .catch((e) => console.log(e));
      } else console.log("Permission not granted");
    } else {
      await Sharing.shareAsync(
        FileSystem.documentDirectory + "SQLite/example.db"
      );
    }
  };

  const importDb = async () => {
    let result = await DocumentPicker.getDocumentAsync({
      copyToCacheDirectory: true,
    });

    if (result.type === "success") {
      setIsLoading(true);

      if (
        !(
          await FileSystem.getInfoAsync(FileSystem.documentDirectory + "SQLite")
        ).exists
      ) {
        await FileSystem.makeDirectoryAsync(
          FileSystem.documentDirectory + "SQLite"
        );
      }

      const base64 = await FileSystem.readAsStringAsync(result.uri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      await FileSystem.writeAsStringAsync(
        FileSystem.documentDirectory + "SQLite/example.db",
        base64,
        { encoding: FileSystem.EncodingType.Base64 }
      );
      await db.closeAsync();
      setDb(SQLite.openDatabase("example.db"));
    }
  };

  useEffect(() => {
    db.transaction((tx) => {
      tx.executeSql(
        "CREATE TABLE IF NOT EXISTS names (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT)"
      );
    });

    db.transaction((tx) => {
      tx.executeSql(
        "SELECT * FROM names",
        null,
        (txObj, resultSet) => setNames(resultSet.rows._array),
        (txObj, error) => console.log(error)
      );
    });

    setIsLoading(false);
  }, [db]);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Loading names...</Text>
      </View>
    );
  }

  const addName = () => {
    if (currentName === undefined || currentName === "") {
      return (
        Alert.alert(
          "Error",
          "Please enter a name.",
          [{ text: "OK", onPress: () => console.log("OK Pressed") }]
        )
      )
    }

    db.transaction((tx) => {
      tx.executeSql(
        "INSERT INTO names (name) values (?)",
        [currentName],
        (txObj, resultSet) => {
          let existingNames = [...names];
          existingNames.push({ id: resultSet.insertId, name: currentName });
          setNames(existingNames);
          setCurrentName(undefined);
        },
        (txObj, error) => console.log(error)
      );
    });
  };

  const deleteName = (id) => {
    db.transaction((tx) => {
      tx.executeSql(
        "DELETE FROM names WHERE id = ?",
        [id],
        (txObj, resultSet) => {
          if (resultSet.rowsAffected > 0) {
            let existingNames = [...names].filter((name) => name.id !== id);
            setNames(existingNames);
          }
        },
        (txObj, error) => console.log(error)
      );
    });
  };

  const showNames = () => {
    return names.map((name, index) => {
      return (
        <>
          <View>
            <Text style={styles.nameText}>{name.name}</Text>
          </View>
          <View key={index} style={styles.deleteUpdate}>
            <Button title="Delete" onPress={() => deleteName(name.id)} />
          </View>
        </>
      );
    });
  };

  return (
    <View style={styles.containerdos}>
      <View style={styles.container}>
        <TextInput
          value={currentName}
          placeholder="Enter name"
          onChangeText={setCurrentName}
          style={styles.input}
        />
      </View>
      <View>
        <Button title="Add Name" onPress={addName} />
        <View style={styles.namesContainer}>{showNames()}</View>
        <View style={styles.buttonContainer}>
          <Button title="Import Db" onPress={importDb} />
          <Button title="Export Db" onPress={exportDb} />
        </View>
      </View>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  containerdos: {
    flex: 1,
    width: "100%",
  },
  container: {
    backgroundColor: "#fff",
    alignItems: "flex-start",
    justifyContent: "flex-start",
    paddingTop: 100,
    marginBottom: 16,
  },
  loadingText: {
    color: "white",
    fontSize: 16,
  },
  input: {
    backgroundColor: "white",
    color: "black",
    width: "100%",
    padding: 8,
    marginBottom: 16,
    borderRadius: 8,
    width: 200,
  },
  namesContainer: {
    marginTop: 16,
    marginBottom: 16,
    width: "100%",
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 59,
    marginBottom: 8,
  },
  nameText: {
    color: "dark",
    fontSize: 16,
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
  },
  showNames: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
  deleteUpdate: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 8,
  },
});
