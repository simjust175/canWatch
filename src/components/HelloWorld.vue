<template>
  <v-container fluid>
    <v-row justify="start">
      <v-col cols="12">
        <img
          src="../../public/Watch.png"
          alt="Watch logo"
          height="100px"
          width="100px"
        />
      </v-col>
    </v-row>

    <v-row class="fill-height mt-2" width="100%" justify="center">
      <v-col cols="12">
        <v-container>
          <v-row>
            <v-col cols="12">
              <v-text-field
                min-width="100%"
                placeholder="Enter a YouTube URL & tap on enter"
                v-model="youtubeURL"
                @keypress.enter="loadURL"
                class="mx-12"
                width="100"
                variant="outlined"
                rounded="md"
                clearable
              ></v-text-field>
            </v-col>
          </v-row>
          <v-row v-if="result">
            <v-col cols="12">
              <h2 class="teal-text">URL - {{ result }}</h2>
              <iframe
                width="560"
                height="315"
                :src="result"
                frameborder="0"
                allow="accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
                allowfullscreen
              ></iframe>
            </v-col>
          </v-row>
        </v-container>
      </v-col>
    </v-row>
  </v-container>
</template>

<script>
export default {
  data() {
    return {
      youtubeURL: "",
      result: "",
    };
  },
  methods: {
    loadURL() {
      //Check if URL starts with YouTube format
      if (!this.youtubeURL.includes("youtube")) {
        console.warn("Please enter a valid YouTube URL");
        return;
      }

      const youtubeEmbedTemplate = "https://www.youtube.com/embed/";
      // const urlParts = new URL(this.youtubeURL); // Use URL object to parse
      // const videoID = urlParts.searchParams.get("v"); // Extract video ID from query param
      const videoID = this.youtubeURL.split("=")[1];

      if (!videoID) {
        console.warn("Couldn't find video ID in the URL");
        return;
      }

      this.result = youtubeEmbedTemplate + videoID;
      this.youtubeURL = "";
    },
  },
};
</script>

<style></style>
